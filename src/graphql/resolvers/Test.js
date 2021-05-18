import * as Sentry from "@sentry/node";
import logger from "../../config/logger";

const moment = require("moment");
const shortid = require("shortid");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");
const Chat = require("../../models/Chat");
const Flag = require("../../models/Flag");
const Filter = require("../../models/Filter");
const URL = require("../../models/URL");
const { client } = require("../../utils/cache");

const VIDEO_QUEUE_KEY = "VIDEO_QUEUE_KEY";
const {
  createProfile,
  linkProfile,
  generateCode,
  convertToCouple,
} = require("./Profile");
const EventResolver = require("./Event");
const UserResolver = require("./User");
const { kinkOptions } = require("../../config/listOptions");

async function makeStockUser({ data, likedProfile, isBlackMember }) {
  /* eslint no-param-reassign: 0 */
  data.isEmailOK = true;
  data.isProfileOK = true;
  let user = new User(data);
  user.location = {
    city: "San Diego, California, US",
    crds: {
      lat: 32.7581696,
      long: -117.1324928,
    },
  };
  const profile = await createProfile({
    user,
    interestedIn: ["M", "F"],
    isBlackMember,
  });

  profile.loc.loc.type = "Point";
  profile.loc.loc.coordinates = [-117.1324928, 32.7581696];
  profile.kinks = ["cuddling"];
  profile.profilePic = "imgs/pic (18).jpg";
  profile.about = "I'm a test user dont mind me";
  profile.publicPhotos = [{ url: "imgs/test.jpg" }];

  if (likedProfile) {
    profile.likeIDs = [likedProfile.toString()];
  }

  await profile.save();

  const newFilter = new Filter({
    userID: user._id,
    profileID: profile._id,
  });
  await newFilter.save();

  user.filterID = newFilter._id;
  user.profileID = profile._id;
  user = await user.save();
  return { profileID: user.profileID, user };
}

async function testload() {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "staging"
  ) {
    try {
      await User.remove({});
      await Profile.remove({});
      await Event.remove({});
      await Chat.remove({});
      await Flag.remove({});
      await Filter.remove({});
      await URL.remove({});
      const today = new Date();
      const renewal = today.setMonth(today.getMonth() + 1).toString();

      const likedProfile = makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "1",
          interestedIn: ["M", "F", "T"],
          username: "TestUser",
          sex: "F",
          dob: "10/10/1989",
          "blackMember.active": true,
          "blackMember.renewalDate": renewal,
          "blackMember.signUpDate": new Date(),
        },
        isBlackMember: true,
      });

      await likedProfile.then(async (pro) => {
        // massLoad({
        //   number: 30,
        //   userID: pro.user._id,
        //   myProfileID: pro.profileID,
        //   fillInbox: false,
        //   likedProfile: pro.profileID,
        // });
        // for (let index = 0; index < 30; index++) {
        //   await User.addNotification({
        //     toUserIDs: [pro.user._id],
        //     type: "alert",
        //     body:
        //       "Love Bonus - Due to the conditions we are living under. We are giving you free Black membership until June. Stay Sexy, Stay Safe - Foxtail",
        //     text: `${index} Good Choice 😉`
        //   });
        // }

        makeStockUser({
          data: {
            email: "cecilcjcarter@gmail.com",
            phone: "+16786337945",
            interestedIn: ["M", "N", "F"],
            username: "USER1",
            sex: "M",
            dob: "10/10/1997",
          },
        });
        makeStockUser({
          data: {
            email: "cecilcjcarter@gmail.com",
            phone: "2",
            interestedIn: ["M", "MF"],
            username: "USER2",
            sex: "N",
            dob: "10/10/2000",
          },
          likedProfile: pro.profileID,
        });
        makeStockUser({
          data: {
            email: "cecilcjcarter@gmail.com",
            phone: "3",
            interestedIn: ["M"],
            username: "USER3",
            sex: "F",
            dob: "10/10/1980",
          },
          likedProfile: pro.profileID,
        });

        makeStockUser({
          data: {
            email: "cecilcjcarter@gmail.com",
            phone: "4",
            interestedIn: ["MM", "FF"],
            username: "USER4",
            sex: "F",
            dob: "10/10/1998",
          },
          likedProfile: pro.profileID,
        });

        makeStockUser({
          data: {
            email: "cecilcjcarter@gmail.com",
            phone: "5",
            interestedIn: ["M", "F"],
            username: "USER5",
            sex: "M",
            dob: "10/10/1979",
          },
          likedProfile: pro.profileID,
        });

        // MAKE EVENTS
        EventResolver.createEvent({
          eventname: "Test",
          image: "",
          description: "This is a test event",
          type: "public",
          startTime: new Date(moment().add(10, "days")),
          endTime: new Date(moment().add(30, "days")),
          tagline: "ready to play",
          interestedIn: ["M"],
          kinks: "cuddling",
          address: "4455 Twain Avenue, San Diego, CA, USA",
          lat: "32.715738",
          long: "-117.0984846",
          req: { user: { _id: pro.user._id, profileID: pro.profileID } },
        });

        EventResolver.createEvent({
          eventname: "Test2",
          image: "",
          description: "This is a test event",
          type: "public",
          startTime: new Date(moment().add(10, "days")),
          endTime: new Date(moment().add(30, "days")),
          tagline: "ready to play",
          interestedIn: ["M"],
          kinks: "cuddling",
          address: "4455 Twain Avenue, San Diego, CA, USA",
          lat: "32.715738",
          long: "-117.0984846",
          req: { user: { _id: pro.user._id, profileID: pro.profileID } },
        });

        EventResolver.createEvent({
          eventname: "Test3",
          image: "",
          description: "This is a test event",
          type: "public",
          startTime: new Date(moment().add(10, "days")),
          endTime: new Date(moment().add(30, "days")),
          tagline: "ready to play",
          interestedIn: ["M"],
          kinks: "cuddling",
          address: "4455 Twain Avenue, San Diego, CA, USA",
          lat: "32.715738",
          long: "-117.0984846",
          req: { user: { _id: pro.user._id, profileID: pro.profileID } },
        });
      });
      resetTest();
      return true;
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e);

      throw new Error(e.message);
    }
  }
  return false;
}

async function inboxFiller(myProfileID, profileID, userID) {
  const chatFields = {};
  chatFields.participants = [myProfileID, profileID];
  // Messages aren't pushing in for initial send.
  chatFields.messages = [
    {
      fromUser: userID,
      text: "HIIII",
      type: "msg",
      createdAt: Date.now(),
    },
  ];
  chatFields.ownerProfileID = myProfileID;
  chatFields.lastSeen = [{ userID, date: Date.now() }];

  await new Chat(chatFields).save();
}

async function resetTest() {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "staging"
  ) {
    try {
      makeStockUser({
        data: {
          email: "incom@foxtailapp.com",
          phone: "+16781111111",
          interestedIn: ["M", "F", "T"],
          username: "IncompleteUser",
          sex: "F",
          dob: "10/10/1989",
          "blackMember.active": false,
          location: {
            city: "San Diego, California, US",
            crds: {
              lat: 32.7581696,
              long: -117.1324928,
            },
          },
        },
        isBlackMember: false,
      }).then((user) => {
        UserResolver.updateSettings({ profilePic: "" }, user);
      });

      makeStockUser({
        data: {
          email: "com@foxtailapp.com",
          phone: "+16782222222",
          interestedIn: ["M", "F", "T"],
          username: "CompleteUser",
          sex: "M",
          dob: "10/10/1999",
          "blackMember.active": false,
          location: {
            city: "San Diego, California, US",
            crds: {
              lat: 32.7581696,
              long: -117.1324928,
            },
          },
        },
        isBlackMember: false,
      });

      const today = new Date();
      const renewal = today.setMonth(today.getMonth() + 1).toString();
      makeStockUser({
        data: {
          email: "blktet@foxtailapp.com",
          phone: "+16783333333",
          interestedIn: ["M", "T"],
          username: "Black",
          sex: "F",
          dob: "10/10/1969",
          "blackMember.active": true,
          "blackMember.renewalDate": renewal,
          "blackMember.signUpDate": new Date(),
          location: {
            city: "San Diego, California, US",
            crds: {
              lat: 32.7581696,
              long: -117.1324928,
            },
          },
        },
        isBlackMember: true,
      });

      makeStockUser({
        data: {
          email: "comp2@foxtailapp.com",
          phone: "+16784444444",
          interestedIn: ["M", "F", "T"],
          username: "CoupleA",
          sex: "M",
          dob: "10/10/1979",
          "blackMember.active": false,
          location: {
            city: "San Diego, California, US",
            crds: {
              lat: 32.7581696,
              long: -117.1324928,
            },
          },
        },
        isBlackMember: false,
      }).then(async (cplA) => {
        const cplCode = await generateCode(cplA);

        const cplB = await makeStockUser({
          data: {
            email: "com4er@foxtailapp.com",
            phone: "+16785555555",
            interestedIn: ["M", "F", "T"],
            username: "CoupleB",
            sex: "F",
            dob: "10/10/1980",
            "blackMember.active": false,
            location: {
              city: "San Diego, California, US",
              crds: {
                lat: 32.7581696,
                long: -117.1324928,
              },
            },
          },
          isBlackMember: false,
        });
        const cplPro = await linkProfile({ code: cplCode, req: cplB });

        await convertToCouple({ req: cplA, coupleProID: cplPro.profileID });
      });
      const usertoDel = await User.findOne({
        phone: "+16783032233",
      });
      if (usertoDel) {
        UserResolver.deleteUser(usertoDel._id);
      }
      return true;
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e);
      throw new Error(e.message);
    }
  }
  return false;
}

async function massLoad({
  number,
  userID,
  myProfileID,
  fillInbox,
  likedProfile,
}) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "staging"
  ) {
    try {
      // eslint-disable-next-line no-plusplus
      for (let i = 1; i <= number; i++) {
        const mths = [
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12",
        ];
        const years = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        const data = {
          email: `${shortid.generate()}@foxtail.com`,
          phone: `000000000${number}`,
          interestedIn: ["M", "F", "N", "MF", "MM", "FF"],
          username: `${i.toString()}Test`,
          sex: "F",
          dob: `${mths[Math.floor(Math.random() * mths.length)]}/${
            mths[Math.floor(Math.random() * mths.length)]
          }/198${years[Math.floor(Math.random() * years.length)]}`,
        };
        const locsList = [
          {
            city: "New York",
            state: "New York",
            lat: "40.7127837",
            long: "-74.0059413",
          },
          {
            city: "Los Angeles",
            state: "California",
            lat: "34.0522342",
            long: "-118.2436849",
          },
          {
            city: "Chicago",
            state: "Illinois",
            lat: "41.8781136",
            long: "-87.6297982",
          },
          {
            city: "Houston",
            state: "Texas",
            lat: "29.7604267",
            long: "-95.3698028",
          },
          {
            city: "Philadelphia",
            state: "Pennsylvania",
            lat: "39.9525839",
            long: "-75.1652215",
          },
          {
            city: "Phoenix",
            state: "Arizona",
            lat: "33.4483771",
            long: "-112.0740373",
          },
          {
            city: "San Antonio",
            state: "Texas",
            lat: "29.4241219",
            long: "-98.4936282",
          },
          {
            city: "San Diego",
            state: "California",
            lat: "32.715738",
            long: "-117.1610838",
          },
          {
            city: "Dallas",
            state: "Texas",
            lat: "32.7766642",
            long: "-96.7969879",
          },
          {
            city: "San Jose",
            state: "California",
            lat: "37.3382082",
            long: "-121.8863286",
          },
        ];
        const selectedLoc =
          locsList[Math.floor(Math.random() * Math.floor(locsList.length))];
        data.isEmailOK = true;
        data.isProfileOK = true;

        let user = new User(data);
        selectedLoc.lat = (
          parseFloat(selectedLoc.lat) + parseFloat(Math.random().toFixed(3))
        ).toString();

        selectedLoc.long = (
          parseFloat(selectedLoc.long) + parseFloat(Math.random().toFixed(3))
        ).toString();

        user.location = {
          city: `${selectedLoc.city}, ${selectedLoc.state}, US`,
          crds: {
            lat: selectedLoc.lat,
            long: selectedLoc.long,
          },
        };

        // eslint-disable-next-line no-await-in-loop
        const profile = await createProfile({
          user,
          interestedIn: ["F", "M", "N", "MF", "FF", "MM", "NN", "FN", "MN"],
        });

        profile.loc.loc.type = "Point";
        profile.loc.loc.coordinates = [selectedLoc.long, selectedLoc.lat];
        const d1 = kinkOptions[Math.floor(Math.random() * kinkOptions.length)];
        const d2 = kinkOptions[Math.floor(Math.random() * kinkOptions.length)];
        const d3 = kinkOptions[Math.floor(Math.random() * kinkOptions.length)];
        profile.kinks = [d1, d2, d3];
        profile.profilePic = `imgs/pic (${i}).jpg`;
        profile.publicPhotos = [{ url: `imgs/pic (${i}).jpg` }];
        if (likedProfile) {
          profile.likeIDs = [likedProfile.toString()];
        }
        const ab = "This is my bio";
        profile.about = ab;

        // eslint-disable-next-line no-await-in-loop
        await profile.save();
        if (fillInbox) {
          // eslint-disable-next-line no-await-in-loop
          await inboxFiller(myProfileID, profile._id, userID);
        }
        const newFilter = new Filter({
          userID: user._id,
          profileID: profile._id,
        });
        // eslint-disable-next-line no-await-in-loop
        await newFilter.save();

        user.filterID = newFilter._id;
        user.profileID = profile._id;
        // eslint-disable-next-line no-await-in-loop
        user = await user.save();
      }

      return true;
    } catch (e) {
      logger.error(e);

      throw new Error(e.message);
    }
  }
  return false;
}

async function testCall(isCheck) {
  if (isCheck) {
    client.set(VIDEO_QUEUE_KEY, JSON.stringify([]), "EX", 21600); // 6 hours cache
  }
  let videoQueue = await client.get(VIDEO_QUEUE_KEY);

  videoQueue = JSON.parse(videoQueue);

  if (videoQueue.length === 0) {
    return [];
  }

  const ret = videoQueue.map(async (el) => {
    const user = await User.findOne({ _id: el.userID });
    return user.username;
  });
  return ret;
}

// async function createAffiliate(details) {
//   const cid = await new Affiliate(details);
//   console.log("cid", cid);
//   cid.save();
// }

// async function addCampaign(id, name) {
//   await Affiliate.findByIdAndUpdate(id, {
//     $push: { campaigns: { name } },
//   });
// }

module.exports = {
  testload,
  resetTest,
  testCall,
  massLoad,
};
