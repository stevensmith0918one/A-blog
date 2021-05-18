import * as Sentry from "@sentry/node";

const moment = require("moment");
const Flag = require("../../models/Flag");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");
const Chat = require("../../models/Chat");
const { clearHash } = require("../../utils/cache");
const config = require("../../config/config");

async function flagItem({ type, targetID, reason, req }) {
  try {
    const existFlag = await Flag.findOne({
      targetID,
      userID: req.user._id,
      type,
    });

    if (existFlag) {
      throw new Error("Client: You may only flag this once!");
    }
    const flag = new Flag({
      type,
      targetID,
      reason,
      userID: req.user._id,
    });

    await flag.save();
    const profile = await Profile.findByIdAndUpdate(
      targetID,
      {
        $push: {
          flagIDs: flag._id,
        },
      },
      {
        new: true,
      }
    );
    switch (type) {
      case config.flagTypes.Chat:
        await Chat.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id,
          },
        });
        break;
      case config.flagTypes.Event:
        await Event.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id,
          },
        });
        break;
      case config.flagTypes.Profile:
        if (targetID === req.user.profileID.toString()) {
          throw new Error("Client: Can't report yourself");
        }
        profile.userIDs.forEach(async (userID) => {
          if (userID === req.user._id.toString()) {
            throw new Error("Client: Can't report yourself");
          }
          await User.findByIdAndUpdate(userID, {
            $push: {
              flagIDs: flag._id,
            },
          });
        });
        break;
      case config.flagTypes.User:
        if (targetID === req.user._id.toString()) {
          throw new Error("Client: Can't report yourself");
        }
        await User.findByIdAndUpdate(targetID, {
          $push: {
            flagIDs: flag._id,
          },
        });
        break;
      default:
        throw new Error("Client: Sorry, not type selected!");
    }
    clearHash(targetID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getFlags(args) {
  try {
    const flags = await Flag.find({
      ...args,
    });

    if (!flags) {
      return [];
    }

    return flags;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function cleanOldFlags() {
  try {
    const end = moment().subtract(60, "days").endOf("day");

    await Flag.deleteMany({
      createdAt: { $lte: end },
      alert: false,
      reviewed: true,
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  flagItem,
  getFlags,
  cleanOldFlags,
};
