import * as Sentry from "@sentry/node";
import logger from "../config/logger";

const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { locSchema, notifySchema } = require("./Generic");
const { clearHash } = require("../utils/cache");
const User = require("./User");

const ProfileSchema = new mongoose.Schema({
  userIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "user",
    required: true,
  },
  userDOBs: {
    type: [Date],
    required: true,
  },
  sex: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  likesToday: {
    count: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now(),
    },
    lastUpdate: {
      type: Date,
      default: Date.now(),
    },
  },
  about: {
    type: String,
    default: "",
  },
  interestedIn: {
    type: [
      {
        type: String,
      },
    ],
    default: [],
    required: true,
  },
  publicPhotos: {
    type: [
      {
        url: {
          type: String,
        },
      },
    ],
    default: [],
  },
  privatePhotos: {
    type: [
      {
        url: {
          type: String,
        },
      },
    ],
    default: [],
  },
  profilePic: {
    type: String,
    default: "",
  },
  profileName: {
    type: String,
    default: "",
  },
  kinks: {
    type: [String],
    default: [],
  },
  isBlackMember: {
    type: Boolean,
    default: false,
    required: true,
  },
  discoverySettings: {
    showOnline: {
      type: Boolean,
      default: true,
    },
    likedOnly: {
      type: Boolean,
      default: false,
    },
    visible: {
      type: Boolean,
      default: true,
    },
  },
  blockedProfileIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "profile",
    default: [],
  },
  blkBlocked: {
    type: [String],
    default: [],
  },
  loc: locSchema,
  cplLink: {
    linkCode: {
      type: String,
      default: "",
    },
    includeMsgs: {
      type: Boolean,
      default: false,
    },
    expiration: {
      type: Date,
      default: Date.now(),
    },
  },
  flagIDs: [
    {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "flag",
      default: [],
    },
  ],
  likeIDs: [
    {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "profile",
      default: [],
    },
  ],
  online: { type: Boolean, default: false, required: true },
  lastActive: {
    type: Date,
    default: Date.now(),
  },
  notifications: [notifySchema],
});

ProfileSchema.statics.offline = async function f(token, ip) {
  // TODO: Consider testing this up top
  const Profile = this;
  const user = await User.findOneAndUpdate(
    {
      "tokens.token": token,
      "tokens.access": "auth",
    },
    {
      $set: {
        online: false,
        "activity.lastActive": new Date(),
        ip,
      },
    },
    { profileID: 1, isCouple: 1, _id: 1 }
  );
  if (!user) {
    return;
  }
  const profile = await Profile.findOne({
    _id: user.profileID,
    active: true,
  });
  if (!profile) {
    return;
  }
  if (user.isCouple) {
    const partnerUserIDArr = profile.userIDs.filter((id) => {
      return id.toString() !== user._id.toString();
    });
    if (partnerUserIDArr) {
      const partnerUser = await User.findById(partnerUserIDArr[0]);
      if (!partnerUser.online) {
        await Profile.findByIdAndUpdate(profile._id, {
          $set: {
            online: false,
            updatedAt: new Date(),
          },
        });
      }
    }
    return;
  }
  await Profile.findByIdAndUpdate(profile._id, {
    $set: {
      online: false,
      updatedAt: new Date(),
    },
  });
};

ProfileSchema.statics.addNotification = function f({
  toMemberIDs,
  type,
  text,
  pic,
  fromUserID,
  targetID,
  name,
  event,
}) {
  const Profile = this;
  try {
    toMemberIDs.forEach(async (id) => {
      const profile = await Profile.findOne({ _id: id, active: true }).cache({
        key: id,
      });

      if (!profile) {
        return;
      }

      await Profile.findByIdAndUpdate(id, {
        $push: {
          notifications: {
            toMemberID: id,
            type,
            text,
            pic,
            fromUserID,
            targetID,
            name,
            event,
          },
        },
      });

      clearHash(id);
    });
    return true;
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
    return false;
  }
};

ProfileSchema.statics.removeNotification = async function f({
  removeMemberIDs,
  type,
  targetID,
}) {
  const Profile = this;

  try {
    await removeMemberIDs.forEach(async (id) => {
      await Profile.updateOne(
        { _id: id },
        {
          $pull: {
            notifications: {
              toMemberID: id,
              type,
              targetID,
            },
          },
        }
      );
    });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error("Remove Notification error:", e.message);
  }
};

ProfileSchema.statics.castID = (id) => mongoose.Types.ObjectId(id);

ProfileSchema.plugin(timestamps);

ProfileSchema.index({ "loc.loc": "2dsphere" });
const Profile = mongoose.model("profile", ProfileSchema);
Profile.createIndexes({ "loc.loc": "2dsphere" });
module.exports = Profile;
