import * as Sentry from "@sentry/node";
import logger from "../../config/logger";
import pubsub from "../../config/pubsub";

const _ = require("lodash");
const shortid = require("shortid");
const moment = require("moment");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Chat = require("../../models/Chat");
const Event = require("../../models/Event");
const Filter = require("../../models/Filter");
const { clearHash } = require("../../utils/cache");
const { getDistance } = require("../../utils/distanceCalc");
const { s3SignUrl } = require("../../middlewares/uploadPicture");
const { sexOptions } = require("../../config/listOptions");
const {
  emailDailyUpdates,
  sendCoupleUnLink,
  sendCoupleLink,
} = require("../../utils/email");

const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";
const NOTICE_ADDED = "NOTICE_ADDED";
const MESSAGE_ADDED = "MESSAGE_ADDED";

const LIMIT_FEATURED = 8;
const DAILY_LIKE_LIMIT = 24;

async function createProfile({
  user,
  interestedIn,
  user2 = null,
  isBlackMember,
}) {
  try {
    // Get fields
    const profileFields = {
      interestedIn,
      isBlackMember,
    };
    // Create and Save Profile
    if (user2 === null) {
      profileFields.userIDs = [user.id];
      profileFields.userDOBs = [user.dob];
      profileFields.sex = user.sex;
      profileFields.profileName = user.username;
    } else {
      profileFields.userIDs = [user.id, user2.id];
      profileFields.userDOBs = [user.dob, user2.dob];

      if (user.sex === "M") {
        if (user2.sex === "M") {
          profileFields.sex = "MM";
        } else if (user2.sex === "F") {
          profileFields.sex = "MF";
        } else {
          profileFields.sex = "MI";
        }
      } else if (user.sex === "F") {
        if (user2.sex === "M") {
          profileFields.sex = "MF";
        } else if (user2.sex === "F") {
          profileFields.sex = "FF";
        } else {
          profileFields.sex = "FI";
        }
      } else {
        profileFields.sex = "II";
      }

      profileFields.profileName = `${user.username} & ${user2.username}`;
    }

    profileFields.publicPhotos = [];
    profileFields.privatePhotos = [];
    profileFields.profilePic = "";
    profileFields.online = true;
    profileFields.loc = {};

    const newProfile = await new Profile(profileFields).save();

    Profile.ensureIndexes();
    return newProfile;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

// 3 steps: (server)get signed url from amazon 2. (client) send file using url 3.
// on successful return from aws, save the url to the db
async function signS3(args) {
  try {
    const s3payload = await s3SignUrl(args);
    if (!s3payload) {
      throw new Error("Client: Error updating file or file invalid");
    }

    return s3payload;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function likeProfile({ toProfileID, req, isDirect }) {
  try {
    if (toProfileID.toString() === req.user.profileID.toString()) {
      throw new Error("Client: Can't like yourself!");
    }

    const date = new Date();

    // Check Validation
    const toProfile = await Profile.findById({
      _id: toProfileID,
    }).cache({ key: toProfileID });

    if (!toProfile) {
      throw new Error("Client: User not found.");
    }

    if (!toProfile.active) {
      throw new Error("Client: Profile no longer available.");
    }

    const myProfile = await Profile.findById({
      _id: req.user.profileID,
    }).cache({ key: req.user.profileID });

    // If like already found unlike profile
    if (myProfile.likeIDs.indexOf(toProfileID) > -1) {
      req.user.activity.likesSent.count -= 1;

      await Chat.findOneAndRemove({
        participants: [req.user.profileID, toProfile.id],
        ownerProfileID: req.user.profileID,
      });

      const likeIDs = _.filter(
        myProfile.likeIDs,
        (likeID) => likeID.toString() !== toProfileID
      );

      await Profile.findByIdAndUpdate(req.user.profileID, {
        $set: {
          likeIDs,
        },
      });

      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          "activity.likesSent.count":
            req.user.activity.likesSent.count < 0
              ? 0
              : req.user.activity.likesSent.count,
          "activity.likesSent.date": date,
        },
      });

      await Profile.findByIdAndUpdate(toProfileID, {
        $inc: { "likesToday.count": -1 },
      });

      clearHash(req.user.profileID);
      clearHash(toProfileID);
      return "unlike";
    }
    if (
      req.user.activity.likesSent.count > DAILY_LIKE_LIMIT &&
      !req.user.blackMember.active
    ) {
      if (moment(req.user.activity.likesSent.date).isSame(date, "day")) {
        throw new Error("Client: Max Daily Likes Reached!");
      } else {
        req.user.activity.likesSent.count = 1;
      }
    } else {
      req.user.activity.likesSent.count += 1;
    }

    await Profile.findByIdAndUpdate(toProfileID, {
      $set: {
        "likesToday.lastUpdate": date,
      },
      $inc: { "likesToday.count": 1 },
    });

    await Profile.findByIdAndUpdate(req.user.profileID, {
      $push: {
        likeIDs: toProfileID,
      },
    });

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        "activity.likesSent.count": req.user.activity.likesSent.count,
        "activity.likesSent.date": date,
      },
    });

    clearHash(toProfileID);
    clearHash(req.user.profileID);

    if (!isDirect) {
      if (toProfile.likeIDs.indexOf(req.user.profileID) > -1) {
        const chat = new Chat({
          participants: [req.user.profileID, toProfile],
          ownerProfileID: req.user.profileID,
        });
        chat.save();
        await pubsub.publish(INBOX_MESSAGE_ADDED, {
          message: {
            fromUser: req.user._id,
            text: "New Match!",
            type: "new",
            createdAt: date,
            chatID: chat._id,
            participants: [req.user.profileID, toProfile.id],
            invited: [],
          },
        });

        return chat._id;
      }
    }
    return "like";
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function linkProfile({ code, req }) {
  try {
    if (!shortid.isValid(code)) {
      throw new Error("Client: Invalid code!");
    }

    const theirProfile = await Profile.findOne({
      "cplLink.linkCode": code,
      active: true,
    });
    if (!theirProfile) {
      throw new Error("Client: Profile not found");
    }
    if (!theirProfile.active) {
      throw new Error("Client: Profile no longer available");
    }
    if (theirProfile.id === req.user.profileID.toString()) {
      throw new Error("Client: This is your code. Send it to your partner.");
    }

    if (moment(theirProfile.cplLink.expiration).isBefore(Date.now())) {
      throw new Error(
        "Client: This code has expired, please request another or send yours."
      );
    }

    const myProfile = await Profile.findById(req.user.profileID);

    if (theirProfile.userIDs.length > 1 || myProfile.userIDs.length > 1) {
      throw new Error("Client: Too many users on this profile!");
    }

    // Have to get username and dont want to double call find Ueer
    const theirUser = await User.findById(theirProfile.userIDs[0]);

    let newProfile;

    await createProfile({
      user: req.user,
      interestedIn: _.merge(theirProfile.interestedIn, myProfile.interestedIn),
      user2: theirUser,
      isBlackMember: myProfile.isBlackMember && theirProfile.isBlackMember,
      blockedProfileIDs: [req.user.profileID, theirProfile.id],
    })
      .then(async function f(profile) {
        // remove old messages between them
        await Chat.findOneAndRemove({
          $or: [
            { participants: [req.user.profileID, theirProfile.id] },
            { participants: [theirProfile.id, req.user.profileID] },
          ],
        });

        newProfile = profile;
        User.addNotification({
          toUserIDs: [req.user.id],
          type: "couple",
          name: theirProfile.profileName,
          coupleProID: newProfile._id,
        });

        await pubsub.publish(NOTICE_ADDED, {
          notification: {
            toUserIDs: [req.user.id],
            type: "couple",
            name: theirProfile.profileName,
            coupleProID: newProfile._id,
          },
        });

        User.addNotification({
          toUserIDs: [theirUser.id],
          type: "couple",
          name: myProfile.profileName,

          coupleProID: newProfile._id,
        });

        await pubsub.publish(NOTICE_ADDED, {
          notification: {
            toUserIDs: [theirUser.id],
            type: "couple",
            name: myProfile.profileName,
            coupleProID: newProfile._id,
          },
        });
      })
      .catch(function f(e) {
        Sentry.captureException(e);
        throw new Error(e.message);
      });

    if (process.env.NODE_ENV !== "development") {
      sendCoupleLink({
        name: req.user.username,
        email: req.user.email,
        lang: req.user.lang,
        theirName: theirUser.username,
      });
      sendCoupleLink({
        name: theirUser.username,
        email: theirUser.email,
        lang: theirUser.lang,
        theirName: req.user.username,
      });
    }

    newProfile.userIDs.forEach((id) => {
      clearHash(id);
    });

    return { profileID: newProfile._id, partnerName: theirUser.username };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function convertToCouple({ req, coupleProID }) {
  try {
    const myProfile = await Profile.findById(req.user.profileID);

    const newProfile = await Profile.findOne({
      _id: coupleProID,
      active: true,
    });

    if (
      !newProfile ||
      !newProfile.userIDs.includes(req.user.id) ||
      newProfile.id === myProfile.id
    ) {
      throw new Error(
        "Client: This Couple's Profile link is no longer active."
      );
    }

    await Profile.findByIdAndUpdate(myProfile.id, {
      $set: {
        active: false,
        "cplLink.linkCode": "",
      },
    });

    migrateToNewProfile({
      profileID: myProfile._id,
      newProfileID: newProfile._id,
      profileName: newProfile.profileName,
      userId: req.user.id,
      includePrevious: myProfile.cplLink.includeMsgs,
    });

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        profileID: newProfile._id,
        isCouple: true,
        isProfileOK: false,
      },
    });
    await User.updateOne(
      { "notifications.coupleProID": coupleProID },
      { $set: { "notifications.$.seen": true, "notifications.$.read": true } }
    );

    clearHash(myProfile._id);
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function migrateToNewProfile({
  profileID,
  newProfileID,
  profileName,
  userId,
  includePrevious,
}) {
  if (includePrevious) {
    await Chat.find(
      {
        participants: { $in: profileID },
      },
      (err, res) => {
        if (!res || err) {
          return;
        }

        res.forEach(async (chat) => {
          const cplMsg = {
            text: `${profileName} has formed a couple`,
            type: "alert",
            fromUser: userId,
            participants: chat.participants,
            invited: chat.invited,
            chatID: chat._id,
            createdAt: new Date(),
          };
          if (!chat.participants.includes(newProfileID)) {
            chat.messages.push(cplMsg);
          }

          // eslint-disable-next-line no-param-reassign
          chat.participants = [
            ...chat.participants.filter(
              (x) =>
                ![profileID.toString(), newProfileID.toString()].includes(
                  x.toString()
                )
            ),
            newProfileID,
          ];

          // eslint-disable-next-line no-param-reassign
          chat.ownerProfileID =
            profileID.toString() === chat.ownerProfileID.toString()
              ? newProfileID
              : chat.ownerProfileID;

          await Chat.findByIdAndUpdate(chat.id, {
            $set: {
              ownerProfileID: chat.ownerProfileID,
              participants: chat.participants,
              messages: chat.messages,
            },
          });

          await pubsub.publish(MESSAGE_ADDED, {
            message: cplMsg,
          });
          await pubsub.publish(INBOX_MESSAGE_ADDED, {
            message: cplMsg,
          });

          clearHash(chat._id);
        });
      }
    );
  }

  await Event.find(
    {
      participants: { $in: profileID },
    },
    (err, res) => {
      res.forEach(async (event) => {
        // eslint-disable-next-line no-param-reassign
        event.participants = [
          ...event.participants.filter(
            (x) =>
              ![profileID.toString(), newProfileID.toString()].includes(
                x.toString()
              )
          ),
          newProfileID,
        ];

        // eslint-disable-next-line no-param-reassign
        event.ownerProfileID =
          profileID.toString() === event.ownerProfileID.toString()
            ? newProfileID
            : event.ownerProfileID;

        await Event.findByIdAndUpdate(event.id, {
          $set: {
            ownerProfileID: event.ownerProfileID,
            participants: event.participants,
          },
        });

        clearHash(event._id);
      });
    }
  );
}

async function unlinkProfile({ profileID }) {
  try {
    const coupleProfile = await Profile.findById(profileID);
    if (!coupleProfile.userIDs[1]) {
      return true;
    }

    const user1 = await User.findById(coupleProfile.userIDs[0]);
    const user2 = await User.findById(coupleProfile.userIDs[1]);

    const user1OldProfile = await Profile.findOneAndUpdate(
      {
        userIDs: {
          $in: [user1._id],
          $nin: [user2._id],
        },
        active: false,
      },
      {
        $set: {
          active: true,
          isBlackMember: !!user1.blackMember.active,
        },
      }
    );
    if (user1OldProfile) {
      await User.findByIdAndUpdate(user1.id, {
        $set: {
          profileID: user1OldProfile._id,
          isCouple: false,
        },
      });
    }
    const user2OldProfile = await Profile.findOneAndUpdate(
      {
        userIDs: {
          $in: [user2._id],
          $nin: [user1._id],
        },
        active: false,
      },
      {
        $set: {
          active: true,
          isBlackMember: !!user2.blackMember.active,
        },
      }
    );

    if (user2OldProfile) {
      await User.findByIdAndUpdate(user2.id, {
        $set: {
          profileID: user2OldProfile._id,
          isCouple: false,
        },
      });
    }
    Chat.find(
      {
        participants: coupleProfile.id,
      },
      (err, res) => {
        const chats = res;
        chats.forEach(async (chat) => {
          clearHash(chat._id);
          chat.messages.push({
            text: coupleProfile.profileName,
            type: "left",
          });
          const removeMsg = {
            text: coupleProfile.profileName,
            type: "left",
            participants: chat.participants,
            invited: chat.invited,
            chatID: chat._id,
            createdAt: new Date(),
          };
          await pubsub.publish(MESSAGE_ADDED, {
            message: removeMsg,
          });
          await pubsub.publish(INBOX_MESSAGE_ADDED, {
            message: removeMsg,
          });
          // eslint-disable-next-line no-param-reassign
          chat.participants = [
            ...chat.participants.filter(
              (x) => x.toString() !== coupleProfile.id.toString()
            ),
          ];

          // eslint-disable-next-line no-param-reassign
          [chat.ownerProfileID] = chat.participants;

          if (chat.participants.length < 2) {
            if (chat.flagIDs.length === 0) {
              chat.remove();
            } else {
              await Chat.findByIdAndUpdate(chat.id, {
                $set: {
                  active: false,
                  ownerProfileID: chat.ownerProfileID,
                  participants: chat.participants,
                  messages: chat.messages,
                },
              });
            }
          } else {
            await Chat.findByIdAndUpdate(chat.id, {
              $set: {
                ownerProfileID: chat.ownerProfileID,
                participants: chat.participants,
                messages: chat.messages,
              },
            });
          }
        });
      }
    );

    Event.find({ ownerProfileID: coupleProfile.id }, (err, res) => {
      res.forEach((event) => {
        event.remove();
      });
    });

    await Profile.findByIdAndUpdate(coupleProfile.id, {
      $set: {
        active: false,
      },
    });

    clearHash(coupleProfile._id);

    if (coupleProfile.flagIDs.length === 0) {
      coupleProfile.remove();
    }

    const notification = {
      link: "/settings",
      toUserIDs: [user1._id, user2._id],
      type: "alert",
      body:
        "Your couple profile couple profile has been closed. Check your out your new profile on the settings page",
      title: "Couple's Profile Closed",
      text: "Couple's Profile Closed",
    };
    if (process.env.NODE_ENV !== "development") {
      sendCoupleUnLink({
        name: user1.username,
        email: user1.email,
        lang: user1.lang,
      });
      sendCoupleUnLink({
        name: user2.username,
        email: user2.email,
        lang: user2.lang,
      });
    }

    User.addNotification(notification);
    clearHash(user1._id);
    clearHash(user2._id);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function generateCode(req) {
  try {
    const profile = await Profile.findById({
      _id: req.user.profileID,
    });
    if (!profile) {
      throw new Error("Client: Profile not found!");
    }

    if (!profile.active) {
      throw new Error("Client: Profile no longer available.");
    }

    if (!profile.userIDs.length > 1) {
      throw new Error("Client: Profile already linked.");
    }
    if (
      profile.cplLink.linkCode &&
      moment(profile.cplLink.expiration).isAfter(Date.now())
    ) {
      return profile.cplLink.linkCode;
    }
    const linkCode = await shortid.generate();

    await Profile.findByIdAndUpdate(profile.id, {
      $set: {
        "cplLink.linkCode": linkCode,
        "cplLink.expiration": moment(Date.now()).add(3, "days"),
      },
    });

    clearHash(req.user.profileID);
    return linkCode;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function searchProfiles(args, req) {
  let profiles;
  let doNotDisplayList = [];

  const {
    searchType,
    long,
    lat,
    city,
    distance,
    ageRange,
    limit,
    skip = 0,
  } = args;

  let { interestedIn } = args;

  const geoFilter = {
    near: {
      type: "Point",
      coordinates: [long, lat],
    },
    distanceMultiplier: req.user.distanceMetric === "km" ? 0.001 : 0.000621371, // meter to ki:miles
    distanceField: "distance",
    spherical: true,
    maxDistance: distance !== 100 ? distance * 1609.34 : 99999999999,
  };

  try {
    // set current location
    await req.user.setLocation({ long, lat, city });

    const myProfile = await Profile.findByIdAndUpdate(req.user.profileID, {
      $set: {
        "loc.loc": {
          type: "Point",
          coordinates: [long, lat],
        },
      },
    });

    clearHash(req.user.profileID);

    if (!myProfile) {
      throw new Error("Client: Profile not found!");
    }

    if (!myProfile.discoverySettings.visible && !req.user.blackMember.active) {
      // Must be visible to see profiles
      return { profiles: [], featuredProfiles: [], message: "invisible" };
    }

    if (!_.isEmpty(myProfile.likeIDs)) {
      doNotDisplayList.unshift(
        ...myProfile.likeIDs.map((item) => item.toString())
      );
    }

    // TODO: REMOVE MATCHED WITHOUT RELYING ON CHAT Particpants
    // ADD MY CURRENT CHAT Friends
    const myChats = await Chat.find(
      {
        $and: [
          {
            $or: [
              {
                participants: req.user.profileID,
              },
              {
                invited: req.user.profileID,
              },
            ],
          },
          {
            active: true,
          },
        ],
      },
      { ownerProfileID: 1, participants: 1 }
    );

    if (!_.isEmpty(myChats)) {
      const recieveMsgs = await myChats.reduce(function f(result, chat) {
        // TODO: figure out how to hide already chating for couples and not chatting yet for singles
        if (chat.participants.length < 3) {
          result.push(...chat.participants);
        }
        return result;
      }, []);
      doNotDisplayList.unshift(...recieveMsgs.map((item) => item.toString()));
    }

    const filter = await Filter.findById({
      _id: req.user.filterID,
    }).cache({ key: req.user.filterID });

    if (filter) {
      if (!_.isEmpty(filter.blocked)) {
        doNotDisplayList.unshift(
          ...filter.blocked.map((item) => item.toString())
        );
      }
    }

    if (!_.isEmpty(doNotDisplayList)) {
      doNotDisplayList = _.uniqBy(doNotDisplayList, String);
    }

    if (interestedIn.length === 0) {
      interestedIn = sexOptions;
    }

    const featuredProfiles = await Profile.aggregate([
      {
        $geoNear: {
          ...geoFilter,
        },
      },
      {
        $match: {
          $and: [
            {
              _id: {
                $ne: Profile.castID(req.user.profileID),
                $nin: doNotDisplayList.map((id) => Profile.castID(id)),
              },
              userDOBs: {
                $lt: moment().subtract(ageRange[0], "years").toDate(),
                $gt: moment().subtract(ageRange[1], "years").toDate(),
              },
              sex: {
                $in: interestedIn,
              },
              likeIDs: {
                $in: [req.user.profileID],
              },
              active: true,
              "discoverySettings.visible": true,
              blockedProfileIDs: {
                $ne: Profile.castID(req.user.profileID),
              },
              about: { $exists: true, $ne: "" },
              profilePic: { $exists: true, $ne: "" },
              kinks: { $exists: true, $ne: [] },
            },
          ],
        },
      },
      { $limit: LIMIT_FEATURED },
    ]).sort({
      isBlackMember: -1,
      "likesToday.count": -1,
    });

    if (!_.isEmpty(featuredProfiles)) {
      doNotDisplayList.unshift(...featuredProfiles.map((item) => item._id));
      doNotDisplayList = _.uniqBy(doNotDisplayList, String);
    }

    switch (searchType) {
      case "liked":
        profiles = await likedProfiles({
          myProfile,
          filter,
          geoFilter,
          ageRange,
          interestedIn,
          skip,
          limit,
          req,
        });
        return { profiles, featuredProfiles: [] };
      case "likedMe":
        profiles = await likedMeProfiles({
          myProfile,
          filter,
          geoFilter,
          ageRange,
          interestedIn,
          skip,
          limit,
          req,
        });
        return { profiles, featuredProfiles };

      default:
        profiles = await allProfiles({
          geoFilter,
          ageRange,
          interestedIn,
          doNotDisplayList,
          skip,
          limit,
          req,
        });
        return { profiles, featuredProfiles };
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function allProfiles({
  geoFilter,
  ageRange,
  interestedIn,
  doNotDisplayList,
  skip,
  limit,
  req,
}) {
  try {
    const profiles = await Profile.aggregate([
      {
        $geoNear: {
          ...geoFilter,
        },
      },
      {
        $match: {
          $and: [
            {
              _id: {
                $ne: Profile.castID(req.user.profileID),
                $nin: doNotDisplayList.map((id) => Profile.castID(id)),
              },
              userDOBs: {
                $lt: moment().subtract(ageRange[0], "years").toDate(),
                $gt: moment().subtract(ageRange[1], "years").toDate(),
              },
              sex: {
                $in: interestedIn,
              },
              active: true,
              "discoverySettings.visible": true,
              "discoverySettings.likedOnly": false,
              blockedProfileIDs: {
                $ne: Profile.castID(req.user.profileID),
              },
              about: { $exists: true, $ne: "" },
              profilePic: { $exists: true, $ne: "" },
              kinks: { $exists: true, $ne: [] },
            },
          ],
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]).sort({
      isBlackMember: -1,
      online: -1,
    });

    return profiles;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

// TODO: How do we remove profiles that are already liking me
async function likedProfiles({
  myProfile,
  filter,
  geoFilter,
  ageRange,
  interestedIn,
  skip,
  limit,
  req,
}) {
  try {
    if (!myProfile.likeIDs.length === 0) {
      return [];
    }

    const doNotDisplayList = [];

    if (filter) {
      if (!_.isEmpty(filter.blocked)) {
        doNotDisplayList.unshift(
          ...filter.blocked.map((item) => item.toString())
        );
      }
    }

    const profiles = await Profile.aggregate([
      {
        $geoNear: {
          ...geoFilter,
        },
      },
      {
        $match: {
          $and: [
            {
              _id: {
                $ne: Profile.castID(req.user.profileID),
                $in: myProfile.likeIDs,
                $nin: doNotDisplayList.map((id) => Profile.castID(id)),
              },
              userDOBs: {
                $lt: moment().subtract(ageRange[0], "years").toDate(),
                $gt: moment().subtract(ageRange[1], "years").toDate(),
              },
              sex: {
                $in: interestedIn,
              },
              active: true,
              "discoverySettings.visible": true,
              likeIDs: {
                $ne: Profile.castID(req.user.profileID),
              },
              blockedProfileIDs: {
                $ne: Profile.castID(req.user.profileID),
              },
            },
          ],
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]).sort({
      isBlackMember: -1,
      online: -1,
    });

    return profiles;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function likedMeProfiles({
  myProfile,
  filter,
  geoFilter,
  ageRange,
  interestedIn,
  skip,
  limit,
  req,
}) {
  try {
    const doNotDisplayList = [];

    if (!_.isEmpty(myProfile.likeIDs)) {
      doNotDisplayList.unshift(
        ...myProfile.likeIDs.map((item) => item.toString())
      );
    }

    if (filter) {
      if (!_.isEmpty(filter.blocked)) {
        doNotDisplayList.unshift(
          ...filter.blocked.map((item) => item.toString())
        );
      }
    }

    if (interestedIn.length === 0) {
      // eslint-disable-next-line no-param-reassign
      interestedIn = sexOptions;
    }

    const profiles = await Profile.aggregate([
      {
        $geoNear: {
          ...geoFilter,
        },
      },
      {
        $match: {
          $and: [
            {
              _id: {
                $ne: Profile.castID(req.user.profileID),
                $nin: doNotDisplayList.map((id) => Profile.castID(id)),
              },
              userDOBs: {
                $lt: moment().subtract(ageRange[0], "years").toDate(),
                $gt: moment().subtract(ageRange[1], "years").toDate(),
              },
              sex: {
                $in: interestedIn,
              },
              active: true,
              "discoverySettings.visible": true,
              likeIDs: req.user.profileID,
              blockedProfileIDs: {
                $ne: Profile.castID(req.user.profileID),
              },
            },
          ],
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]).sort({
      isBlackMember: -1,
      online: -1,
    });

    return profiles;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function blockProfile({ blockedProfileID, req }) {
  try {
    if (blockedProfileID === req.user.profileID.toString()) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          captchaReq: true,
        },
      });
      return false;
    }
    const filter = await Filter.findById({
      _id: req.user.filterID,
    }).cache({ key: req.user.filterID });

    if (filter.blocked) {
      if (filter.blocked.indexOf(blockedProfileID) > -1) {
        throw new Error("Client: Block Profile ID already found.");
      }
    }
    // Add to blocked user to array
    await Filter.findByIdAndUpdate(req.user.filterID, {
      $push: {
        blocked: blockedProfileID,
      },
    });

    // update profile for not showing when viewing
    await Profile.findByIdAndUpdate(req.user.profileID, {
      $push: {
        blockedProfileIDs: blockedProfileID,
      },
    });
    clearHash(req.user.filterID);
    clearHash(req.user.profileID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getByID(id, req) {
  try {
    const myProfile = await Profile.findById(req.user.profileID).cache({
      key: req.user.profileID,
    });

    if (!myProfile) {
      return null;
    }

    // block those from being seen who have been blocked
    if (myProfile.blockedProfileIDs.indexOf(id) > -1) {
      return null;
    }
    let profile = await Profile.findOne({
      _id: id,
      active: true,
    }).cache({ key: id });

    if (!profile) {
      return null;
    }

    let distance;
    if (req.user.distanceMetric === "km") {
      distance = getDistance(
        req.user.location.crds.lat,
        req.user.location.crds.long,
        profile.loc.loc.coordinates[1],
        profile.loc.loc.coordinates[0],
        "K"
      );
    } else {
      distance = getDistance(
        req.user.location.crds.lat,
        req.user.location.crds.long,
        profile.loc.loc.coordinates[1],
        profile.loc.loc.coordinates[0],
        "M"
      );
    }

    profile = { ...profile.toObject(), distance };
    if (req.user.profileID.toString() !== "5e728e5b892533001037da07") {
      if (
        (profile.likeIDs.indexOf(myProfile._id) < 0 ||
          myProfile.likeIDs.indexOf(profile._id) < 0) &&
        req.user.profileID.toString() !== id
      ) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < profile.privatePhotos.length; i++) {
          profile.privatePhotos[i].url = "private";
        }
      }
    }

    // Temp field for ui
    profile.likedByMe = myProfile.likeIDs.indexOf(id) > -1;

    // ADD MY CURRENT CHAT Friends
    const myChats = await Chat.find(
      {
        $and: [
          {
            $or: [
              {
                participants: req.user.profileID,
              },
              {
                invited: req.user.profileID,
              },
            ],
          },
          {
            $or: [
              {
                participants: id,
              },
              {
                invited: id,
              },
            ],
          },
          {
            active: true,
          },
        ],
      },
      { participants: 1, invited: 1 }
    );

    if (!_.isEmpty(myChats)) {
      const recieveMsgs = await myChats.reduce(function f(result, chat) {
        if (chat.participants.length < 3) {
          chat.participants.forEach((el) => result.push(el.toString()));
          chat.invited.forEach((el) => result.push(el.toString()));
        }

        return result;
      }, []);

      // Temp field for ui
      profile.msgdByMe = recieveMsgs.indexOf(id) > -1;
    }

    return profile;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function toggleOnline(req) {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { online: true } });
    await Profile.findByIdAndUpdate(req.user.profileID, {
      $set: { online: true },
    });

    clearHash(req.user._id);
    clearHash(req.user.profileID);

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function updateLastActive(req) {
  try {
    Profile.updateOne(
      { id: req.user.profileID },
      { $set: { lastActive: Date.now() } }
    );

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function offlineCheck() {
  try {
    const minsago = moment().subtract(30, "minutes");

    const profiles = await Profile.find({
      lastActive: { $lt: minsago.toDate() },
      online: true,
    });

    profiles.forEach(async (profile) => {
      await Profile.findByIdAndUpdate(profile.id, {
        $set: {
          online: false,
        },
      });
      clearHash(profile._id);
    });

    return true;
  } catch (e) {
    Sentry.captureException({ offlineCheck: e });
    throw new Error(e.message);
  }
}

async function sendDailyUpdates() {
  try {
    const start = moment().startOf("day");
    const likedProfiles2 = await Profile.find(
      {
        "likesToday.date": { $gte: start },
        "likesToday.lastUpdate": { $gte: start },
        "likesToday.count": { $gt: 0 },
        lastActive: { $lt: start },
      },
      {
        "likesToday.count": 1,
        id: 1,
      }
    );

    if (likedProfiles2.length === 0) return null;

    const likedUsers = await likedProfiles2.reduce(async (result, profile) => {
      const users = await User.find(
        {
          profileID: profile.id,
          active: true,
        },
        {
          username: 1,
          "notificationRules.emailNotify": 1,
          lang: 1,
          email: 1,
        }
      );

      users.forEach((user) => {
        result.push({ user, likesCount: profile.likesToday.count });
      });
      await Profile.findByIdAndUpdate(profile.id, {
        $set: { "likesToday.lastUpdate": Date.now(), "likesToday.count": 0 },
      });
      return result;
    }, []);

    if (likedUsers.length === 0) {
      return null;
    }

    likedUsers.forEach((likeUserObj) => {
      const { user, likesCount } = likeUserObj;

      if (user.notificationRules.emailNotify && likesCount > 0) {
        emailDailyUpdates({
          email: user.email,
          likesCount,
          userName: user.username,
          lang: user.lang,
        });
      }
    });

    return true;
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  createProfile,
  likeProfile,
  linkProfile,
  searchProfiles,
  generateCode,
  blockProfile,
  getByID,
  signS3,
  unlinkProfile,
  toggleOnline,
  sendDailyUpdates,
  updateLastActive,
  offlineCheck,
  convertToCouple,
};
