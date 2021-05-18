/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-param-reassign */
import * as Sentry from "@sentry/node";
import logger from "../../src/config/logger";

const User = require("../../src/models/User");
const Profile = require("../../src/models/Profile");
const Event = require("../../src/models/Event");
const Chat = require("../../src/models/Chat");
const Flag = require("../../src/models/Flag");
const Filter = require("../../src/models/Filter");
const { createProfile } = require("../../src/graphql/resolvers/Profile");
const { login } = require("../../src/graphql/resolvers/User");

let user1;
let user2;
let user3;
let user4;
let user5;

async function makeStockUser({ data, likedProfile, isBlackMember }) {
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
  user.password = "PASS908";
  const profile = await createProfile({
    user,
    interestedIn: ["M", "F"],
    isBlackMember,
  });

  profile.loc.loc.type = "Point";
  profile.cplLink.linkCode = "PPBqWA9";
  profile.cplLink.expiration = new Date();
  profile.cplLink.expiration.setDate(new Date().getDate() + 1);
  user.activity.lastEmailReset = new Date();
  user.activity.lastEmailReset.setDate(new Date().getDate() - 1);
  profile.loc.loc.coordinates = [-117.1324928, 32.7581696];
  profile.kinks = ["cuddling"];
  profile.profilePic = "imgs/test.jpg";
  profile.about = "I'm a test user dont mind me";

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
  const tokens = await login({ phone: data.phone, password: "PASS908" });
  return {
    profileID: user.profileID,
    userID: user._id,
    token: tokens[0].token,
  };
}

async function seedDatabase() {
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

      logger.info("seeding database");

      user1 = await makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "1",
          interestedIn: ["M", "F", "T"],
          username: "USER1",
          sex: "F",
          dob: "10/10/1989",
        },
      });
      user2 = await makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "2",
          interestedIn: ["M", "MF"],
          username: "USER2",
          sex: "N",
          dob: "10/10/2000",
        },
        likedProfile: user1.profileID,
      });

      user3 = await makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "3",
          interestedIn: ["M"],
          username: "USER3",
          sex: "F",
          dob: "10/10/1980",
        },
        likedProfile: user1.profileID,
      });

      user4 = await makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "4",
          interestedIn: ["MM", "FF"],
          username: "USER4",
          sex: "F",
          dob: "10/10/1998",
        },
        likedProfile: user1.profileID,
      });

      user5 = await makeStockUser({
        data: {
          email: "cecilcjcarter@gmail.com",
          phone: "5",
          interestedIn: ["M", "F"],
          username: "USER5",
          sex: "M",
          dob: "10/10/1979",
          "blackMember.active": true,
        },
        likedProfile: user1.profileID,
        isBlackMember: true,
      });
      return true;
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e);
      throw new Error(e.message);
    }
  }
  return true;
}

export { seedDatabase as default, user1, user2, user3, user4, user5 };
