import * as Sentry from "@sentry/node";
import logger from "../../config/logger";

const _ = require("lodash");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { emailTranslate } = require("../../utils/translate");
const { deleteFromS3 } = require("../../middlewares/uploadPicture");
const creditcardHandler = require("../../utils/creditcardHandler");
const {
  sendVerEMail,
  newPhoneAcct,
  sendPhoneReset,
  // emailAccountOld,
  sendEmailToAdmin,
  sendBonusEmailToUser,
  sendBlkCancelToUser,
  sendPasswordReset,
  emailDeleted,
  sendWelcome,
  sendEmailToFinishProfile,
  sendCoupleInstructions,
  sendPromo,
} = require("../../utils/email");
const { clearHash } = require("../../utils/cache");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Filter = require("../../models/Filter");
const Chat = require("../../models/Chat");
const Event = require("../../models/Event");
const Affiliate = require("../../models/Affiliate");
const { createProfile, unlinkProfile } = require("./Profile");

async function login({ phone, password }) {
  const user = await User.findOne({ phone, active: true });

  try {
    if (!user) {
      return [];
    }

    if (user.password) {
      const passResult = await user.comparePassword(password);
      if (!passResult) {
        return [];
      }
    } else if (password) {
      return [];
    }

    if (user.flagIDs.length >= 3) {
      return [];
    }

    if (!user.active) {
      return [];
    }

    const tokens = await user.generateAuthTokens();

    await User.findByIdAndUpdate(user._id, {
      $set: {
        tokens,
      },
    });

    return tokens;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function create(data, isCouple) {
  try {
    const { email, phone, interestedIn, username } = data;

    if (!phone) {
      throw new Error("Client: You must verify your phone number.");
    }

    if (!email) {
      throw new Error("Client: You must provide an email.");
    }

    if (!username) {
      throw new Error("Client: You must provide a user name.");
    } else if (validator.isMobilePhone(username)) {
      throw new Error(
        "Client: Phone numbers are not allowed in your username."
      );
    } else if (validator.isEmail(username)) {
      throw new Error("Client: Emails are not allowed in your username.");
    } else if (validator.isURL(username)) {
      throw new Error("Client: Links are not allowed in your username.");
    }

    const flagIDs = [];

    const existingUsers = await User.find({
      phone,
      active: true,
    });

    existingUsers.forEach(async (existingUser) => {
      // CLEAN OLD USER AND  NOTIFY
      await newPhoneAcct({
        username: existingUser.username,
        email: existingUser.email,
        lang: existingUser.lang,
      });

      await removeProfileFromSite(existingUser.profileID, existingUser._id);

      await deleteFilter(existingUser.filterID);
      if (existingUser.flagIDs.length > 0) {
        flagIDs.push(existingUser.flagIDs);
      }
      await User.findByIdAndUpdate(existingUser._id, {
        $set: {
          active: false,
        },
      });
    });

    if (flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }

    /* eslint no-param-reassign: 0 */
    data.flagIDs = flagIDs;

    const user = new User(data);

    const profile = await createProfile({
      user,
      interestedIn,
    });

    const newFilter = new Filter({
      userID: user._id,
      profileID: profile._id,
      "searchParams.interestedIn": interestedIn,
    });
    await newFilter.save();

    user.filterID = newFilter._id;
    user.profileID = profile._id;

    const oldNumUser = await User.findOne(
      {
        phone,
        active: false,
      },
      { id: 1 }
    );

    if (!oldNumUser) {
      if (data.ref) {
        user.activity.referrals.referredBy = data.ref;
        applyBonus({ id: data.ref, type: "User", isRefer: true });
      } else if (data.cid) {
        user.activity.referrals.referredBy = data.cid;
        applyBonus({
          id: user._id,
          type: "User",
          isRefer: false,
        });
        await Affiliate.findOneAndUpdate(
          { "campaigns._id": data.cid },
          {
            $inc: {
              "campaigns.$.totalSignups": 1,
              "campaigns.$.signups.$[].number": 1,
            },
          }
        );
      } else {
        applyBonus({ id: user._id, type: "User", isRefer: false });
      }
    }

    if (process.env.NODE_ENV === "development") {
      if (
        (user.email === "chat1@foxtailapp.com" &&
          user.phone === "3434455456") ||
        (user.email === "chat2@foxtailapp.com" && user.phone === "54569009569")
      ) {
        user.blackMember.active = true;
        user.isEmailOK = true;
      }
    }

    // SEND EMAIL CONFIRMATION with Welcome
    sendWelcome({
      name: user.username,
      email: user.email,
      lang: user.lang,
      id: user._id,
    });

    user.tokens = await user.generateAuthTokens();
    await User.addNotification({
      toUserIDs: [user._id],
      type: data.ref ? "msg" : "alert",
      body:
        "It's your lucky day! - We are giving you free Black membership until April. Stay Sexy, Stay Safe - Foxtail",
      text: "Good Choice 😉",
    });

    if (isCouple) {
      sendCoupleInstructions({
        name: user.username,
        email: user.email,
        lang: user.lang,
      });
    }

    user.save();
    return user.tokens;
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function applyBonus({ id, isRefer }) {
  try {
    let notification;
    let renewal;

    const user = await User.findById(id).cache({ key: id });

    if (user) {
      user.blackMember.active = true;

      if (!user.blackMember.renewalDate) {
        renewal = moment(new Date("April 2, 2021 23:15:30"));
        // TODO: revert in April
        // renewal = moment().add(7, "d");
        user.blackMember.signUpDate = new Date();
      } else {
        renewal = moment(user.blackMember.renewalDate).add(7, "d");
      }

      user.blackMember.renewalDate = renewal;

      const formatedDate = renewal.format("LL").toString();

      const { lang } = user;

      if (isRefer) {
        if (user.activity.referrals) {
          user.activity.referrals.total += 1;
          user.activity.referrals.today += 1;
        } else {
          user.activity.referrals = { total: 0, today: 0 };
        }

        user.notifications = user.notifications.filter(
          (x) => x.title === "Black Membership Referral Bonus Activated"
        );

        const body = `${emailTranslate("Congratulations", lang)} ${
          user.activity.referrals.today
        } ${emailTranslate(
          "member(s) joined Foxtail using your referral code.",
          lang
        )}(${user.activity.referrals.total} ${emailTranslate(
          "referrals total) Your Black Membership is extended til",
          lang
        )} ${formatedDate}`;

        notification = {
          toUserIDs: [user._id],
          type: "notice",
          body,
          title: "Black Membership Referral Bonus Activated",
          text: "Black Membership Referral Bonus Activated",
          read: true,
        };

        await User.findByIdAndUpdate(user._id, {
          $set: {
            notifications: user.notifications,
            "activity.referrals": user.activity.referrals,
            blackMember: user.blackMember,
          },
        });
      } else {
        // TODO: Fix this in April
        //  "Welcome! We've upgraded you to Black Membership for 1 week. We will add more weeks, when you share Foxtail. Enjoy!",
        const body = emailTranslate(
          "Welcome! We've upgraded you to Black Membership until April. We will add more weeks, when you share Foxtail. Enjoy!",
          lang
        );
        notification = {
          toUserIDs: [user._id],
          type: "notice",
          body,
          title: "Black Membership Referral Bonus Activated",
          text: "Black Membership Referral Bonus Activated",
        };

        if (user.notificationRules.emailNotify) {
          sendPromo({
            name: user.username,
            email: user.email,
            lang: user.lang,
          });
          // sendBlkBonusActiveToUser({
          //   name: user.username,
          //   email: user.email,
          //   lang: user.lang
          // });
        }
        await User.findByIdAndUpdate(user._id, {
          $set: {
            notifications: user.notifications,
            "activity.referrals": user.activity.referrals,
            blackMember: user.blackMember,
          },
        });
      }
      User.addNotification(notification);
      clearHash(user._id);
    }
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function removeUserFromChats(userId, profileID, profileName) {
  try {
    Sentry.setContext("removing my chats", {
      profileName,
    });
    await Chat.updateMany(
      {
        participants: {
          $in: [profileID],
        },
      },
      {
        $pull: {
          messages: { fromUser: userId },
        },
      }
    );
    Sentry.setContext("update everyone i left", {
      profileName,
    });
    await Chat.updateMany(
      {
        participants: {
          $in: [profileID],
        },
      },
      {
        $pull: {
          participants: {
            $in: [profileID],
          },
          invited: {
            $in: [profileID],
          },
        },
        $push: {
          messages: {
            fromUser: userId,
            type: "left",
            text: profileName,
          },
        },
      }
    );

    Sentry.setContext("removing my own Chat", {
      profileName,
    });
    await Chat.deleteMany({
      $or: [
        {
          participants: {
            $in: [profileID],
            $size: 2,
          },
        },
        {
          participants: {
            $in: [profileID],
            $size: 1,
          },
        },
        { ownerProfileID: profileID },
      ],
    });

    return true;
  } catch (e) {
    Sentry.captureException(e, {
      func: removeUserFromChats,
    });

    throw new Error(e.message);
  }
}

async function removeProfileFromEvents(profileID) {
  await Event.deleteMany({ ownerProfileID: profileID });

  await Event.updateMany(
    {
      $or: [
        {
          participants: {
            $in: [profileID],
          },
        },
        {
          invited: {
            $in: [profileID],
          },
        },
      ],
    },
    {
      $pull: {
        participants: {
          $in: [profileID],
        },
        invited: {
          $in: [profileID],
        },
      },
    }
  );

  return true;
}

async function submitPhoto({ type, image, req }) {
  try {
    const { user } = req;
    if (user.verifications) {
      if (user.verifications.photoVer && user.verifications.photoVer.active) {
        throw new Error("Client: Photo verification already submitted.");
      } else if (
        user.verifications.stdVer &&
        user.verifications.stdVer.active
      ) {
        throw new Error("Client: STD verification already submitted.");
      } else if (
        user.verifications.acctVer &&
        user.verifications.acctVer.active
      ) {
        throw new Error("Client: Reconsideration already submitted.");
      }
    } else {
      user.verifications = {};
    }

    switch (type) {
      case "verify":
        user.verifications.photoVer.active = false;
        user.verifications.photoVer.image = image;
        user.verifications.photoVer.date = new Date();
        break;
      case "std":
        user.verifications.stdVer.active = false;
        user.verifications.stdVer.image = image;
        user.verifications.stdVer.date = new Date();
        break;
      case "acct":
        user.verifications.acctVer.active = false;
        user.verifications.acctVer.image = image;
        user.verifications.acctVer.date = new Date();
        break;
      default:
        break;
    }
    await User.findByIdAndUpdate(user._id, {
      $set: {
        verifications: user.verifications,
      },
    });

    messageAdmin({
      req,
      text: `${type} - ${user._id}`,
      type: "verify",
      profilePic: user.profilePic,
      image,
    });
    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function updateSettings(
  {
    distance,
    distanceMetric,
    ageRange,
    lang,
    interestedIn,
    city,
    lat,
    long,
    sex,
    username,
    email,
    visible,
    newMsgNotify,
    emailNotify,
    showOnline,
    likedOnly,
    sexuality,
    vibrateNotify,
    about,
    kinks,
    publicPhotoList,
    privatePhotoList,
    includeMsgs,
    profilePic,
  },
  req
) {
  try {
    const myUser = req.user;
    const myProfile = await Profile.findById(myUser.profileID);

    if (
      !_.isUndefined(visible) ||
      !_.isUndefined(likedOnly) ||
      !_.isUndefined(showOnline) ||
      !_.isUndefined(lat) ||
      !_.isUndefined(long) ||
      !_.isUndefined(kinks) ||
      !_.isUndefined(about) ||
      !_.isUndefined(profilePic) ||
      !_.isUndefined(includeMsgs) ||
      !_.isUndefined(publicPhotoList) ||
      !_.isUndefined(privatePhotoList) ||
      !_.isUndefined(username) ||
      !_.isUndefined(interestedIn)
    ) {
      if (_.isUndefined(myProfile) || _.isNull(myProfile)) {
        throw new Error("Client: Profile no longer exists");
      }

      if (!_.isUndefined(lat) && !_.isUndefined(long)) {
        myProfile.loc.loc = {
          type: "Point",
          coordinates: [long, lat],
        };
      }

      if (!_.isUndefined(visible)) {
        myProfile.discoverySettings.visible = visible;
      }

      if (!_.isUndefined(interestedIn)) {
        myProfile.interestedIn = interestedIn;
      }
      if (!_.isUndefined(profilePic)) {
        myProfile.profilePic = profilePic;
      }
      if (!_.isUndefined(kinks)) {
        myProfile.kinks = kinks;
      }
      if (!_.isUndefined(about)) {
        about.split(" ").forEach((word) => {
          if (validator.isURL(word)) {
            throw new Error("Client: Links are not allowed in your bio.");
          } else if (validator.isMobilePhone(word)) {
            throw new Error(
              "Client: Phone numbers are not allowed in your bio."
            );
          } else if (validator.isEmail(word)) {
            throw new Error("Client: Email is not allowed in your bio.");
          }
        });
        myProfile.about = about;
      }

      if (!_.isUndefined(includeMsgs)) {
        myProfile.cplLink.includeMsgs = includeMsgs;
      }

      if (!_.isUndefined(publicPhotoList)) {
        if (publicPhotoList.length > 4 && !myUser.blackMember.active) {
          throw new Error(
            "Client: Please upgrade to Black Membership to save unlimited photos."
          );
        }

        publicPhotoList = publicPhotoList.map((el) => ({
          url: JSON.parse(el).key,
        }));

        deleteRemovedFromS3({
          newPics: publicPhotoList.map((el) => el.url),
          oldPics: myProfile.publicPhotos.map((el) => el.url),
        });

        if (publicPhotoList.length === 0) {
          myProfile.publicPhotos = [];
        } else {
          myProfile.publicPhotos = publicPhotoList;
        }
      }

      if (!_.isUndefined(privatePhotoList)) {
        if (privatePhotoList.length > 4 && !myUser.blackMember.active) {
          throw new Error(
            "Client: Please upgrade to Black Membership to save unlimited photos."
          );
        }

        privatePhotoList = privatePhotoList.map((el) => ({
          url: JSON.parse(el).key,
        }));

        deleteRemovedFromS3({
          newPics: privatePhotoList.map((el) => el.url),
          oldPics: myProfile.privatePhotos.map((el) => el.url),
        });

        if (privatePhotoList.length === 0) {
          myProfile.privatePhotos = [];
        } else {
          myProfile.privatePhotos = privatePhotoList;
        }
      }

      if (myUser.blackMember.active) {
        if (!_.isUndefined(likedOnly)) {
          myProfile.discoverySettings.likedOnly = likedOnly;
        }
        if (!_.isUndefined(showOnline)) {
          myProfile.discoverySettings.showOnline = showOnline;
        }
      }
    }

    if (
      !_.isUndefined(newMsgNotify) ||
      !_.isUndefined(vibrateNotify) ||
      !_.isUndefined(emailNotify) ||
      !_.isUndefined(city) ||
      !_.isUndefined(lang) ||
      !_.isUndefined(username) ||
      !_.isUndefined(sex) ||
      !_.isUndefined(email) ||
      !_.isUndefined(distanceMetric) ||
      !_.isUndefined(sexuality) ||
      !_.isUndefined(profilePic)
    ) {
      if (!_.isUndefined(city)) {
        if (myUser.blackMember.active || !myUser.location.lat) {
          myUser.location.city = city;

          if (!_.isUndefined(lat) && !_.isUndefined(long)) {
            myUser.location.crds = { lat, long };
          }
        } else {
          throw new Error("Client: Only Black Members can change location.");
        }
      }

      if (!_.isUndefined(distanceMetric)) {
        myUser.distanceMetric = distanceMetric;
      }
      if (!_.isUndefined(profilePic)) {
        deleteRemovedFromS3({
          newPics: [profilePic],
          oldPics: [myUser.profilePic],
        });
        myUser.profilePic = profilePic;
      }
      if (!_.isUndefined(lang)) {
        myUser.lang = lang;
      }
      if (!_.isUndefined(sexuality)) {
        myUser.sexuality = sexuality;
      }

      if (!_.isUndefined(username)) {
        const lastDuration = moment.duration(
          moment(Date.now()).diff(moment(myUser.activity.nameChange))
        );
        const days = lastDuration.days();

        if (!myUser.activity.nameChange || days >= 30) {
          await User.findByIdAndUpdate(myUser._id, {
            $set: {
              username,
              "activity.nameChange": Date.now(),
            },
          });

          await Profile.findByIdAndUpdate(myProfile._id, {
            $set: {
              profileName: myProfile.profileName.replace(
                req.user.username,
                username
              ),
            },
          });

          return true;
        }
        throw new Error(
          "Client: You can only change your username once every 30 days."
        );
      }

      if (!_.isUndefined(sex)) {
        if (!myUser.activity.sexChange) {
          await User.findByIdAndUpdate(myUser._id, {
            $set: {
              sex,
              "activity.sexChange": true,
            },
          });
          return true;
        }
        throw new Error("Client: Can't change your sex more than once.");
      }

      if (!_.isUndefined(email)) {
        await User.findByIdAndUpdate(myUser._id, {
          $set: {
            email,
            isEmailOK: false,
          },
        });

        // SEND EMAIL CONFIRMATION
        sendVerEMail(email, myUser._id);
        return true;
      }

      if (!_.isUndefined(newMsgNotify)) {
        myUser.notificationRules.newMsgNotify = newMsgNotify;
      }

      if (!_.isUndefined(vibrateNotify)) {
        myUser.notificationRules.vibrateNotify = vibrateNotify;
      }

      if (!_.isUndefined(emailNotify)) {
        myUser.notificationRules.emailNotify = emailNotify;
      }

      // TODO: TRY NEW MONGOOSE TIMESTAMP TO SET USING WHOLE OBJECT
      await User.findByIdAndUpdate(myUser._id, {
        $set: {
          location: myUser.location,
          distanceMetric: myUser.distanceMetric,
          profilePic: myUser.profilePic,
          lang: myUser.lang,
          sexuality: myUser.sexuality,
          notificationRules: myUser.notificationRules,
        },
      });

      await clearHash(myUser._id);
    }

    if (
      !_.isUndefined(distance) ||
      !_.isUndefined(distanceMetric) ||
      !_.isUndefined(ageRange) ||
      !_.isUndefined(interestedIn)
    ) {
      const myFilter = await Filter.findById(myUser.filterID);

      if (!_.isUndefined(distance)) {
        myFilter.searchParams.distance = distance;
      }

      if (!_.isUndefined(distanceMetric)) {
        myFilter.searchParams.distanceMetric = distanceMetric;
      }

      if (!_.isUndefined(ageRange)) {
        myFilter.searchParams.ageRange = ageRange;
      }

      if (!_.isUndefined(interestedIn)) {
        myFilter.searchParams.interestedIn = interestedIn;
      }

      await Filter.findByIdAndUpdate(myUser.filterID, {
        $set: {
          searchParams: {
            ...myFilter.searchParams,
          },
        },
      });

      await clearHash(myUser.filterID);
    }

    if (
      myProfile.publicPhotos.length > 0 &&
      myProfile.publicPhotos[0].url !== "" &&
      myProfile.about !== "" &&
      myProfile.about !== null &&
      myProfile.about.length >= 20 &&
      myProfile.kinks.length > 0 &&
      myProfile.profilePic !== ""
    ) {
      if (!myUser.isProfileOK) {
        if (myUser.isCouple) {
          myProfile.userIDs.forEach(async (id) => {
            await User.findByIdAndUpdate(id, {
              $set: {
                isProfileOK: true,
              },
            });
            await clearHash(id);
          });
        } else {
          await User.findByIdAndUpdate(myUser._id, {
            $set: {
              isProfileOK: true,
            },
          });
          await clearHash(myUser._id);
        }
        myUser.isProfileOK = true;
      }
    } else if (myUser.isProfileOK) {
      if (myUser.isCouple) {
        myProfile.userIDs.forEach(async (id) => {
          await User.findByIdAndUpdate(id, {
            $set: {
              isProfileOK: false,
            },
          });
          await clearHash(id);
        });
      } else {
        await User.findByIdAndUpdate(myUser._id, {
          $set: {
            isProfileOK: false,
          },
        });
        await clearHash(myUser._id);
      }
      myUser.isProfileOK = false;
    }

    await Profile.findByIdAndUpdate(myProfile.id, {
      $set: {
        discoverySettings: myProfile.discoverySettings,
        privatePhotos: myProfile.privatePhotos,
        publicPhotos: myProfile.publicPhotos,
        "cplLink.includeMsgs": myProfile.cplLink.includeMsgs,
        about: myProfile.about,
        kinks: myProfile.kinks,
        profilePic: myProfile.profilePic,
        interestedIn: myProfile.interestedIn,
        profileName: myProfile.profileName,
        "loc.loc": myProfile.loc.loc,
      },
    });
    await clearHash(myProfile.id);

    // RETURNS PROFILEOK
    return myUser.isProfileOK;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function deleteRemovedFromS3({ newPics, oldPics }) {
  const removed = oldPics.filter((e) => !newPics.includes(e));
  if (removed.length > 0) deleteFromS3(removed);
}

async function updateLocation({ lat, long, city, req }) {
  if (!_.isUndefined(lat) && !_.isUndefined(long) && !_.isUndefined(city)) {
    const myUser = req.user;
    if (req.user.blackMember.active || !myUser.location.lat) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          location: {
            city,
            crds: { lat, long },
          },
        },
      });

      await Profile.findByIdAndUpdate(req.user.profileID, {
        $set: {
          "loc.loc": {
            type: "Point",
            coordinates: [long, lat],
          },
        },
      });

      await clearHash(req.user._id);
      await clearHash(req.user.profileID);
    } else {
      throw new Error(
        "Client: You must be a Black Member to change your location."
      );
    }
    return true;
  }
  return false;
}

const iff = (condition, then, otherwise) => (condition ? then : otherwise);

async function getSettings(req) {
  try {
    const settings = {
      distance: 100,
      distanceMetric: "mi",
      ageRange: [18, 80],
      interestedIn: ["M", "F"],
      city: null,
      lat: null,
      long: null,
      visible: true,
      newMsgNotify: true,
      lang: "en",
      emailNotify: true,
      showOnline: true,
      likedOnly: false,
      vibrateNotify: false,
      couplePartner: null,
      users: null,
      publicPhotos: [],
      privatePhotos: [],
      about: null,
      kinks: [],
      includeMsgs: false,
      profilePic: "",
      sexuality: "",
      password: undefined,
      ccLast4: "",
      verifications: [],
    };

    const { user } = req;

    if (user) {
      settings.newMsgNotify = user.notificationRules.newMsgNotify;
      settings.vibrateNotify = user.notificationRules.vibrateNotify;
      settings.emailNotify = user.notificationRules.emailNotify;
      settings.city = user.location.city;
      settings.lat = user.location.lat;
      settings.long = user.location.long;
      settings.lang = user.lang;
      settings.lastActive = user.activity.lastActive;
      settings.sexuality = user.sexuality;
      settings.password = user.password ? "" : undefined;
      settings.ccLast4 = user.payment.ccLast4;
      settings.verifications = {
        photo: iff(
          user.verifications.photoVer.active,
          "active",
          user.verifications.photoVer.image !== "" ? "pending" : "notactive"
        ),
        std: iff(
          user.verifications.stdVer.active,
          "active",
          user.verifications.stdVer.image !== "" ? "pending" : "notactive"
        ),
      };
    }

    const filter = await Filter.findById({
      _id: user.filterID,
    });

    if (filter) {
      settings.distance = filter.searchParams.distance;
      settings.distanceMetric = filter.searchParams.distanceMetric;
      settings.ageRange = filter.searchParams.ageRange;
      settings.interestedIn = filter.searchParams.interestedIn;
    }

    const profile = await Profile.findById(user.profileID).cache({
      key: user.profileID,
    });

    if (profile) {
      settings.visible = profile.discoverySettings.visible;
      const partnerIDs = _.filter(
        profile.userIDs,
        (userId) => userId.toString() !== req.user.id.toString()
      );

      if (!_.isEmpty(partnerIDs)) {
        const partner = await User.findById(partnerIDs[0]).cache({
          key: partnerIDs[0],
        });
        settings.couplePartner = partner.username;
      }

      settings.users = profile.userIDs;
      settings.publicPhotos = profile.publicPhotos;
      settings.privatePhotos = profile.privatePhotos;
      settings.profilePic = profile.profilePic;
      settings.about = profile.about;
      settings.kinks = profile.kinks;
      settings.includeMsgs = profile.cplLink.includeMsgs;
      settings.likedOnly = profile.discoverySettings.likedOnly;
      settings.showOnline = profile.discoverySettings.showOnline;
    }

    return settings;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function getByID(id) {
  try {
    const user = await User.findById({
      _id: id,
      active: true,
    }).cache({ key: id });

    if (!user) {
      throw new Error("Client: User not found");
    }

    return user;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function deleteUser(userID) {
  try {
    const user = await User.findById({
      _id: userID,
    });
    if (!user) return true;

    emailDeleted({
      email: user.email,
      userName: user.username,
      lang: user.lang,
    });
    await removeProfileFromSite(user.profileID, user._id);
    await deleteFilter(user.filterID);

    user.active = false;
    user.online = false;

    // Erase all data but keep info for comm
    // Need to notify us to check flagged
    if (user.flagIDs && user.flagIDs.length === 0) {
      user.active = false;
      user.tokens = [];
      user.verifications = { photo: false, std: false };
      user.blackMember.active = false;
      user.notificationRules = {
        newMsgNotify: true,
        vibrateNotify: false,
        emailNotify: true,
      };
      user.location = { city: "" };
      user.isProfileOK = false;
      user.isEmailOK = false;
      user.dob = Date.now();
      user.sharedApp = false;
      user.notifications = [];
      user.sex = "M";
      user.verifications = {};
    }

    user.isNew = false;
    await user.save();
    clearHash(user._id);
    return true;
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
  }
  return true;
}

async function removeProfileFromSite(profileID, userID) {
  let profile = await Profile.findById(profileID);

  if (!profile) {
    return;
  }

  await removeProfileFromEvents(profileID);

  await removeUserFromChats(userID, profileID, profile.profileName);
  const toDeleteImgs = _.uniq(
    _.compact([
      ...profile.publicPhotos.map((el) => el.url),
      ...profile.privatePhotos.map((el) => el.url),
      profile.profilePic,
    ])
  );

  deleteRemovedFromS3({
    newPics: [],
    oldPics: toDeleteImgs,
  });

  if (profile.userIDs.length > 1) {
    if (await unlinkProfile({ profileID })) {
      profile = await Profile.findOne({
        userIDs: [userID],
        active: true,
      });
    }
  }

  if (profile.flagIDs.length > 0) {
    await Profile.findByIdAndUpdate(profile._id, {
      $set: {
        active: false,
      },
    });
  } else {
    await profile.remove();
  }

  clearHash(profileID);
}

async function deleteFilter(filterID) {
  await Filter.findByIdAndRemove(filterID);
  clearHash(filterID);
}

// TODO: Email when subscreated and when updated
async function createSubscription({ ccnum, exp, cvc, fname, lname, req }) {
  try {
    const { user } = req;
    if (!user) {
      throw new Error("Client: User does not exist");
    }

    if (!user.payment.subscriptionId) {
      await creditcardHandler.createSubscription(
        {
          ccnum,
          exp,
          cvc,
          phone: user.phone,
          email: user.email,
          fname,
          lname,
        },
        (res) => activateBlackMembership(res, user, ccnum.slice(-4))
      );
    } else {
      await creditcardHandler.updateCustomerPaymentProfile(
        {
          subscriptionId: user.payment.subscriptionId,
          ccnum,
          exp,
          cvc,
          phone: user.phone,
          email: user.email,
          fname,
          lname,
        },
        () => updateBlackMembership(user, ccnum.slice(-4))
      );
    }

    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e);
  }
}

async function activateBlackMembership(customer, user, ccLast4) {
  try {
    user.payment.customerID = customer.profile.customerProfileId;
    user.payment.subscriptionId = customer.subscriptionId;
    user.payment.ccLast4 = ccLast4;

    user.blackMember.active = true;
    const today = new Date();
    const renewal = today.setMonth(today.getMonth() + 1).toString();
    user.blackMember.renewalDate = renewal;
    user.blackMember.signUpDate = new Date();

    await User.findByIdAndUpdate(user._id, {
      $set: {
        payment: user.payment,
        blackMember: user.blackMember,
      },
    });

    const formatedDate = moment().add(1, "month").format("LL").toString();

    let theirUser;

    if (user.isCouple) {
      const ourProfile = await Profile.findById(user.profileID);

      const theirUserID = ourProfile.userIDs.find((el) => {
        return el !== user._id;
      });

      theirUser = await User.findById(theirUserID).cache({
        key: theirUserID,
      });

      if (theirUser.blackMember.active) {
        await Profile.findByIdAndUpdate(user.profileID, {
          $set: { isBlackMember: true },
        });
      }
    } else {
      await Profile.findByIdAndUpdate(user.profileID, {
        $set: { isBlackMember: true },
      });
    }

    // TODO: Figure out how to notify when a couple partne risnt black no black profile
    // if (theirUser && !theirUser.blackMember.active) {
    //   const notification = {
    //     toUserIDs: [user._id],
    //     body:
    //       "Your Black Membership is active, but your partner is not a Black member yet. You have access to all upgraded features but your profile can't be upgraded until they join also.",
    //     title: "Partner Membership Not Upgraded",
    //     text: "Partner Membership Not Upgraded"
    //   };

    //    User.addNotification(notification);
    // }

    const notification = {
      toUserIDs: [user._id],
      type: "alert",
      body:
        "Thank you for upgrading to Black Membership. Your renewal date is ",
      event: formatedDate,
      title: "Black Membership Activated",
      text: "Black Membership Activated",
    };

    User.addNotification(notification);

    clearHash(user._id);
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function updateBlackMembership(user, ccLast4) {
  try {
    if (user.payment.subscriptionId) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "payment.ccLast4": ccLast4,
        },
      });
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body: "Credit card information has been updated.",
        title: "Credit Card Updated",
        text: "Credit Card Updated",
      };

      User.addNotification(notification);

      clearHash(user._id);
      return;
    }
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function cancelSubcription({ req }) {
  try {
    const { user } = req;
    if (!user) {
      throw new Error("Client: User does not exist");
    }

    if (user.payment.subscriptionId) {
      await creditcardHandler.cancelSubscription(
        user.payment.subscriptionId,
        () => cancelBlackMembership(user)
      );
    }
    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function cancelBlackMembership(user) {
  try {
    if (user.payment.subscriptionId) {
      user.payment.customerID = "";
      user.payment.subscriptionId = "";
      user.payment.ccLast4 = "";
      await User.findByIdAndUpdate(user._id, {
        $set: {
          payment: user.payment,
        },
      });
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body:
          "Black Membership has been canceled and you will no longer be charged. You still have use of all Black features until the end of your billing cycle.",
        title: "Black Membership Canceled",
        text: "Black Membership Canceled",
      };

      User.addNotification(notification);
      clearHash(user._id);
      return;
    }
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function getNotifications({ limit, skip, req }) {
  try {
    const notifications = [];

    const { user } = req;

    if (!user) {
      throw new Error("Client: User not found.");
    }

    if (user.notifications) {
      notifications.push(...user.notifications);
    }

    const profile = await Profile.findById(req.user.profileID).cache({
      key: req.user.profileID,
    });

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }
    if (profile.notifications) {
      notifications.push(...profile.notifications);
    }

    const total = notifications.length;

    if (total === 0) {
      return { notifications: [], total };
    }

    const noticesLeft = _.slice(
      _.sortBy(notifications, (note) => note.date).reverse(),
      skip
    );

    let finalNotices = await _.take(noticesLeft, limit);

    if (finalNotices === null || finalNotices === undefined) {
      finalNotices = [];
    }

    updateNotifications({
      notificationIDs: finalNotices.map((notice) => {
        if (notice) return notice._id;
        return null;
      }),
      seen: true,
      req,
    });
    return { notifications: finalNotices, total };
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function updateNotifications({ notificationIDs, read, seen, both, req }) {
  try {
    if (seen || both) {
      await notificationIDs.forEach(async (noticeID) => {
        await User.updateOne(
          { "notifications._id": noticeID },
          { $set: { "notifications.$.seen": true } }
        );

        await Profile.updateOne(
          {
            "notifications._id": noticeID,
          },
          { $set: { "notifications.$.seen": true } }
        );
      });
    }
    if (read || both) {
      await notificationIDs.forEach(async (noticeID) => {
        await User.updateOne(
          { "notifications._id": noticeID },
          { $set: { "notifications.$.read": true } }
        );

        await Profile.updateOne(
          {
            "notifications._id": noticeID,
          },
          { $set: { "notifications.$.read": true } }
        );
      });
    }

    clearHash(req.user._id);
    clearHash(req.user.profileID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getCounts({ req }) {
  try {
    const notifications = [];

    const { user } = req;
    let alert;

    if (!user) {
      throw new Error("Client: User not found.");
    }
    if (user.notifications) {
      notifications.push(...user.notifications);
    }

    alert = _.last(
      notifications.filter(
        (note) => note.type === "alert" && note.read === false
      )
    );
    if (alert) {
      updateNotifications({
        notificationIDs: [alert._id],
        both: true,
        req,
      });
    }

    const profile = await Profile.findById(req.user.profileID);

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }
    if (profile.notifications) {
      notifications.push(...profile.notifications);
    }
    if (!alert) {
      alert = _.last(
        notifications.filter(
          (note) => note.type === "alert" && note.read === false
        )
      );
      if (alert) {
        updateNotifications({
          notificationIDs: [alert._id],
          both: true,
          req,
        });
      }
    }

    const noticesCount = await notifications.filter(
      (notice) => notice.seen === false
    ).length;

    const chats = await Chat.find(
      {
        $and: [
          {
            $or: [
              { participants: req.user.profileID },
              { invited: req.user.profileID },
            ],
            eventID: { $exists: false },
            active: true,
          },
        ],
      },
      { messages: 1, lastSeen: 1, id: 1, participants: 1 }
    );

    let newMsg = false;
    const msgsCount = chats.reduce(function f(res, chat) {
      const count = calcUnseenMsgs({ chat, userID: req.user._id });
      if (count !== null) {
        res += count;
      } else {
        newMsg = true;
      }
      return res;
    }, 0);

    return { msgsCount, noticesCount, alert, newMsg };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

// TODO: Make util for this, chat, and message
function calcUnseenMsgs({ chat, userID }) {
  let unSeenCount = 0;

  let lastSeen = chat.lastSeen.find(
    (el) => el.userID.toString() === userID.toString()
  );

  // They've never seen the entire chat
  if (lastSeen === undefined) {
    unSeenCount = chat.messages.length === 0 ? null : chat.messages.length;
  } else {
    lastSeen = lastSeen.date;
    const unSeen = chat.messages.filter((message) => {
      if (moment(message.createdAt).isAfter(lastSeen)) {
        if (
          message.fromUser &&
          message.fromUser.toString() === userID.toString()
        ) {
          return false;
        }
        return true;
      }
      return false;
    });

    unSeenCount = unSeen.length;
  }

  return unSeenCount;
}

async function seenTour() {
  // try {
  // if (tour === "reset") {
  //   await User.findByIdAndUpdate(req.user._id, {
  //     $set: {
  //       tours: []
  //     }
  //   });
  //   clearHash(req.user._id);

  //   return true;
  // }

  // await User.findByIdAndUpdate(req.user._id, {
  //   $push: {
  //     tours: tour
  //   }
  // });

  // clearHash(req.user._id);

  return true;
  /* } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  } */
}

async function confirmEmail({ token }) {
  try {
    let jwtResp;
    try {
      jwtResp = jwt.verify(token, global.secrets.EMAIL_SECRET);
    } catch (e) {
      return false;
    }

    const { userID, email } = jwtResp;
    if (!userID) {
      return false;
    }

    // Use email to deactive all the only activate the one
    await User.updateMany(
      { email, _id: { $ne: userID } },
      {
        $set: {
          isEmailOK: false,
        },
      }
    );

    await User.updateOne(
      { _id: userID, email },
      {
        $set: {
          isEmailOK: true,
        },
      }
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function confirmPhone({ phone, userID }) {
  try {
    const existingUser = await User.findOne({
      phone,
      _id: { $ne: userID },
      active: true,
    });

    if (existingUser) {
      if (existingUser.flagIDs.length >= 3) {
        throw new Error(
          "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
        );
      }
      await User.findByIdAndUpdate(existingUser._id, {
        $set: {
          active: false,
        },
      });
      // NOTIFY OLD USER OF PHONE USED
      await newPhoneAcct({
        username: existingUser.username,
        email: existingUser.email,
        lang: existingUser.lang,
      });
    }

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function sendPhoneResetEmail({ phone }) {
  try {
    const user = await User.findOne({ phone, active: true });

    if (!user) {
      throw new Error(
        "Client: Email has been sent to the account associated with this phone number. If it exists."
      );
    }

    const now = moment(new Date()); // todays date
    const end = moment(user.activity.lastEmailReset); // another date
    const duration = moment.duration(now.diff(end));
    const lastDuration = duration._milliseconds;

    if (lastDuration > 300000) {
      // SEND EMAIL CONFIRMATION
      sendPhoneReset({
        email: user.email,
        id: user._id,
        username: user.username,
        lang: user.lang,
      });
      return true;
    }
    throw new Error(
      "Client: Reset email has been sent to you within the last 5 minutes. Please check your spam."
    );
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function sendPasswordResetEmail({ phone, email }) {
  let user;
  try {
    user = await User.findOne({ phone, email });
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
  if (!user) {
    throw new Error(
      "Client: Email has been sent to the account associated with this phone number. If it exists."
    );
  }
  const now = moment(new Date()); // todays date
  const end = moment(user.activity.lastEmailReset); // another date
  const duration = moment.duration(now.diff(end));
  const lastDuration = duration._milliseconds;

  if (lastDuration > 300000) {
    if (user) {
      // SEND EMAIL CONFIRMATION
      sendPasswordReset({
        email: user.email,
        id: user._id,
        username: user.username,
        lang: user.lang,
      });
    }
  } else {
    throw new Error(
      "Client: Reset email has been sent to you within the last 5 minutes. Please check your spam."
    );
  }
  return true;
}

async function canceledMemberships() {
  try {
    const end = moment().subtract(1, "days").endOf("day");

    const users = await User.find({
      "blackMember.renewalDate": { $lt: end },
      "blackMember.active": true,
    });

    users.forEach(async (user) => {
      const profile = await Profile.findById(user.profileID);
      await User.findByIdAndUpdate(user.id, {
        $set: {
          "blackMember.active": false,
        },
      });

      await Profile.findByIdAndUpdate(user.profileID, {
        $set: {
          isBlackMember: false,
          publicPhotos: profile.publicPhotos.slice(0, 4),
          privatePhotos: profile.privatePhotos.slice(0, 4),
          "discoverySettings.showOnline": true,
          "discoverySettings.likedOnly": false,
        },
      });

      if (user.notificationRules.emailNotify) {
        sendBlkCancelToUser({
          name: user.username,
          email: user.email,
        });
      }
      const notification = {
        toUserIDs: [user._id],
        type: "alert",
        body:
          "Your Black Member profile has been reverted to a Free profile. Please note - Photos over the 4 photo limit have been removed.",
        text: "Profile changed to Free Profile",
      };

      User.addNotification(notification);
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);
    throw new Error(e.message);
  }
}

// TODO: Fix this
async function removeOldAccounts() {
  return true;
  // try {
  //   const yearAgoS = moment().subtract(1, "years").startOf("date");
  //   const yearAgoE = moment().subtract(1, "years").endOf("date");
  //   const elevenMthsAgoS = moment().subtract(11, "months").startOf("date");
  //   const elevenMthsAgoE = moment().subtract(11, "months").endOf("date");

  //   const almostCancel = await User.find(
  //     {
  //       $and: [
  //         { "activity.lastActive": { $gte: elevenMthsAgoS } },
  //         { "activity.lastActive": { $lt: elevenMthsAgoE } },
  //         { active: true },
  //       ],
  //     },
  //     { email: 1, username: 1, lang: 1 }
  //   );
  //   console.log(
  //     "almostCancel",
  //     almostCancel,
  //     moment("2020-02-21T05:08:24.522+00:00").isAfter(elevenMthsAgoS),
  //     moment("2020-02-21T05:08:24.522+00:00").isBefore(elevenMthsAgoE)
  //   );
  //   almostCancel.forEach((user) => {
  //     if (user.notificationRules.emailNotify) {
  //       emailAccountOld({
  //         email: user.email,
  //         userName: user.username,
  //         lang: user.lang,
  //       });
  //     }
  //   });

  //   const toDelete = await User.find(
  //     {
  //       $and: [
  //         { "activity.lastActive": { $gte: yearAgoS } },
  //         { "activity.lastActive": { $lt: yearAgoE } },
  //         { active: true },
  //       ],
  //     },
  //     { _id: 1, lang: 1, email: 1, username: 1 }
  //   );

  //   toDelete.forEach((user) => {
  //     emailDeleted({
  //       email: user.email,
  //       userName: user.username,
  //       lang: user.lang,
  //     });
  //     deleteUser(user._id);
  //   });

  //   return true;
  // } catch (e) {
  //   Sentry.captureException(e);
  //   throw new Error(e.message);
  // }
}

async function messageAdmin({
  name,
  email,
  text,
  type,
  req,
  profilePic,
  image,
}) {
  try {
    if (req.user) {
      await sendEmailToAdmin({
        name: req.user.username,
        email: req.user.email,
        text,
        user: true,
        type,
        profilePic,
        image,
      });
    } else {
      await sendEmailToAdmin({ name, email, text, user: false, type });
    }
    return true;
  } catch (e) {
    Sentry.captureException(e);
  }
  return false;
}

async function resendVerEMail({ req }) {
  try {
    return await sendVerEMail(req.user.email, req.user._id).then((resp) => {
      if (resp) {
        return true;
      }
      return false;
    });
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function remindToFinishProfile() {
  try {
    const daysAgo = moment().subtract(2, "days").endOf("day");

    const toRemind = await User.find({
      "activity.lastActive": { $lt: daysAgo },
      "activity.lastEmail": { $lt: daysAgo },
      isProfileOK: false,
      active: true,
    });

    toRemind.forEach(async (user) => {
      await sendEmailToFinishProfile({
        email: user.email,
        name: user.username,
        lang: user.lang,
      });

      await User.findByIdAndUpdate(user.id, {
        $set: { "activity.lastEmail": new Date() },
      });
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function referralUpdates() {
  try {
    const toRemind = await User.find({
      "activity.referrals.today": { $gt: 0 },
      "notificationRules.emailNotify": true,
      active: true,
    });

    toRemind.forEach(async (user) => {
      const formatedDate = moment(user.blackMember.renewalDate)
        .format("LL")
        .toString();
      sendBonusEmailToUser({
        name: user.username,
        email: user.email,
        renewal: formatedDate,
        today: user.activity.referrals.today,
        lang: user.lang,
      });

      await User.findByIdAndUpdate(user.id, {
        $set: { "activity.referrals.today": 0 },
      });
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

async function noticesSeen(req) {
  try {
    const notifications = [];
    const { user } = req;

    if (!user) {
      throw new Error("Client: User not found.");
    }

    if (user.notifications) {
      notifications.push(...user.notifications);
    }

    const profile = await Profile.findById(req.user.profileID).cache({
      key: req.user.profileID,
    });

    if (!profile) {
      throw new Error("Client: Profile not found.");
    }
    if (profile.notifications) {
      notifications.push(...profile.notifications);
    }
    return true;
  } catch (e) {
    Sentry.captureException(e);

    throw new Error(e.message);
  }
}

module.exports = {
  login,
  create,
  messageAdmin,
  submitPhoto,
  updateSettings,
  getByID,
  deleteUser,
  getSettings,
  createSubscription,
  cancelSubcription,
  getNotifications,
  updateNotifications,
  getCounts,
  seenTour,
  confirmEmail,
  sendPhoneResetEmail,
  sendPasswordResetEmail,
  updateLocation,
  confirmPhone,
  canceledMemberships,
  removeOldAccounts,
  resendVerEMail,
  remindToFinishProfile,
  referralUpdates,
  noticesSeen,
  applyBonus,
};
