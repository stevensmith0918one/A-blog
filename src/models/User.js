import * as Sentry from "@sentry/node";
import logger from "../config/logger";

const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const timestamps = require("mongoose-timestamp");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const { clearHash } = require("../utils/cache");
const { notifySchema } = require("./Generic");

const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function f() {
  return this.toString();
};
// TODO:Change back in April
const getWeekFromNow = () => {
  const date = new Date("April 2, 2021 23:15:30");
  return date;
};
// Every user has an email and password.  The password is not stored as
// plain text - see the authentication helpers below.
const UserSchema = new mongoose.Schema({
  profileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "profile",
  },
  username: {
    type: String,
    required: true,
    minlength: 2,
  },
  payment: {
    customerID: {
      type: String,
      default: "",
    },
    subscriptionId: {
      type: String,
      default: "",
    },
    ccLast4: {
      type: String,
      default: "",
    },
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    default: "",
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  sharedApp: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "flag",
    default: [],
  },
  filterID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "filter",
  },
  dob: {
    type: Date,
    required: true,
  },
  sex: {
    type: String,
    required: true,
  },
  lang: {
    type: String,
    default: "en",
  },
  lastAnnounceDate: {
    type: Date,
    default: Date.now(),
  },
  profilePic: {
    type: String,
    default: "",
  },
  blackMember: {
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    renewalDate: {
      type: Date,
      default: getWeekFromNow(),
    },
    signUpDate: {
      type: Date,
      default: Date.now(),
    },
    cancelDate: {
      type: Date,
      default: null,
    },
  },
  appVersion: {
    type: String,
    default: "1.0.0",
  },
  notificationRules: {
    newMsgNotify: {
      type: Boolean,
      default: true,
      required: true,
    },
    vibrateNotify: {
      type: Boolean,
      default: false,
      required: true,
    },
    emailNotify: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  activity: {
    sexChange: {
      type: Boolean,
      default: false,
    },
    nameChange: {
      type: Date,
      default: null,
    },
    lastActive: {
      type: Date,
      default: Date.now(),
    },
    lastEmail: {
      type: Date,
      default: Date.now(),
    },
    lastEmailReset: {
      type: Date,
      default: Date.now(),
    },
    linksSent: {
      count: {
        type: Number,
        default: 0,
      },
      today: {
        type: Date,
        default: Date.now(),
      },
      ignoreDate: {
        type: Date,
        default: null,
      },
    },
    likesSent: {
      count: {
        type: Number,
        default: 0,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
    msgsSent: {
      count: {
        type: Number,
        default: 0,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
    referrals: {
      referredBy: {
        type: String,
        default: "",
      },
      total: {
        type: Number,
        default: 0,
      },
      today: {
        type: Number,
        default: 0,
      },
    },
  },
  isProfileOK: {
    type: Boolean,
    default: false,
    required: true,
  },
  isEmailOK: {
    type: Boolean,
    default: false,
    required: true,
  },
  isCouple: {
    type: Boolean,
    default: false,
    required: true,
  },
  verifications: {
    photoVer: {
      image: {
        type: String,
        default: "",
      },
      active: {
        type: Boolean,
        default: false,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
    stdVer: {
      image: {
        type: String,
        default: "",
      },
      active: {
        type: Boolean,
        default: false,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
    acctVer: {
      image: {
        type: String,
        default: "",
      },
      active: {
        type: Boolean,
        default: false,
      },
      date: {
        type: Date,
        default: Date.now(),
      },
    },
  },
  location: {
    city: { type: String, default: "" },
    crds: {
      lat: { type: Number, default: 0 },
      long: { type: Number, default: 0 },
    },
  },
  distanceMetric: {
    type: String,
    default: "mi",
    required: true,
  },
  online: { type: Boolean, default: false, required: true },
  notifications: [notifySchema],
  sexuality: {
    type: String,
    default: "",
  },
  tokens: [
    {
      access: {
        type: String,
        required: true,
      },
      token: {
        type: String,
        required: true,
      },
    },
  ],
  captchaReq: {
    type: Boolean,
    default: false,
  },
  ip: {
    type: String,
    default: "",
  },
});

// The user's password is never saved in plain text.  Prior to saving the
// user model, we 'salt' and 'hash' the users password.  This is a one way
// procedure that modifies the password - the plain text password cannot be
// derived from the salted + hashed version. See 'comparePassword' to understand
// how this is used.
UserSchema.pre("save", function save(next) {
  const user = this;

  if (!user.isModified("password") || user.password === "") {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(user.password, salt, null, (cryerr, hash) => {
      if (cryerr) {
        return next(cryerr);
      }
      user.password = hash;
      return next();
    });
    return next();
  });
  return next();
});

// We need to compare the plain text password (submitted whenever logging in)
// with the salted + hashed version that is sitting in the database.
// 'bcrypt.compare' takes the plain text password and hashes it, then compares
// that hashed password to the one stored in the DB.  Remember that hashing is
// a one way process - the passwords are never compared in plain text form.
UserSchema.methods.comparePassword = function comparePassword(
  candidatePassword
) {
  try {
    const match = bcrypt.compareSync(candidatePassword, this.password);
    return match;
  } catch (e) {
    return false;
  }
};

UserSchema.methods.toJSON = function f() {
  const user = this;
  const userObject = user.toObject();

  return _.pick(userObject, ["_id", "email"]);
};

UserSchema.methods.generateAuthTokens = async function f() {
  const user = this;
  if (!user) {
    return [];
  }

  const refreshtoken = jwt
    .sign({ _id: user._id, access: "refresh" }, global.secrets.JWT_SECRET2, {
      expiresIn: global.secrets.REFRESH_TOKEN_EXPIRATION,
    })
    .toString();
  const authtoken = jwt
    .sign({ _id: user._id, access: "auth" }, global.secrets.JWT_SECRET, {
      expiresIn: global.secrets.AUTH_TOKEN_EXPIRATION,
    })
    .toString();

  return [
    { access: "auth", token: authtoken },
    { access: "refresh", token: refreshtoken },
  ];
};

UserSchema.statics.addNotification = function f({
  toUserIDs,
  type,
  text,
  pic,
  body,
  link,
  targetID,
  name,
  event,
  coupleProID,
}) {
  const User = this;

  try {
    toUserIDs.forEach(async (id) => {
      try {
        // TODO:DO wwe need to check? will update not fail if id doesnt exist
        const user = await User.findOne({ _id: id, active: true }).cache({
          key: id,
        });
        if (!user) {
          return;
        }
        await User.findByIdAndUpdate(id, {
          $push: {
            notifications: {
              toMemberID: id,
              type,
              text,
              body,
              link,
              pic,
              targetID,
              name,
              event,
              coupleProID,
            },
          },
        });

        clearHash(id);
      } catch (err) {
        Sentry.captureException({ "addNotification userID": id, err });
      }
    });

    return true;
  } catch (e) {
    logger.error(e);
    throw new Error("Notification error:", e.message);
  }
};

UserSchema.methods.removeToken = function f(token) {
  const user = this;
  return user.updateOne({
    $pull: {
      tokens: { token },
    },
  });
};

UserSchema.statics.setCapLock = async function f({ id, ip }) {
  try {
    await User.findByIdAndUpdate(id, {
      $set: {
        ip,
        captchaReq: true,
      },
    });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
};

UserSchema.statics.resolveCapLock = async function f({ capToken, ip }) {
  try {
    const result = await axios({
      method: "post",
      url: "https://www.google.com/recaptcha/api/siteverify",
      params: {
        secret: global.secrets.GOOGLE_RECAPTCHA_SECRET_KEY,
        response: capToken,
        remoteip: ip,
      },
    });
    const response = result.data || {};

    if (response.success) {
      await User.findOneAndUpdate(
        {
          ip,
        },
        {
          $set: {
            captchaReq: false,
            "activity.linksSent.ignoreDate": Date.now(),
          },
        }
      );

      return true;
    }
    return false;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
};

UserSchema.methods.setLocation = async function f({ long, lat, city }) {
  try {
    const user = this;
    if (user.location.city === "") {
      clearHash(user.id);
      return user.updateOne({
        $set: {
          "location.city": city,
          "location.crds": {
            lat,
            long,
          },
        },
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error("Remove Notification error:", e.message);
  }
  return {};
};

// TODO: Check usage of await and async
UserSchema.statics.findByToken = async function f(token) {
  try {
    const User = this;
    if (!User) return {};

    try {
      await jwt.verify(token, global.secrets.JWT_SECRET);
    } catch (e) {
      if (~e.message.indexOf("expired")) {
        const user = await User.findOne({
          "tokens.token": token,
          "tokens.access": "auth",
        });
        if (!user) return {};
        const refreshToken = user.tokens.find(
          (tkn) => tkn.access === "refresh"
        );

        const newtokens = await tokenRefresh(refreshToken.token);

        return await User.findOne({
          "tokens.token": newtokens.token,
          "tokens.access": "auth",
        });
      }
      Sentry.captureException(e);
      throw new Error(`Find by token error1:${e.message}`);
    }

    return await User.findOne({
      "tokens.token": token,
      "tokens.access": "auth",
    });
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
    throw new Error(`Find by token error2:${e.message}`);
  }
};

UserSchema.statics.refreshToken = async function f(refreshtoken, ip) {
  let decoded;

  try {
    decoded = jwt.verify(refreshtoken, global.secrets.JWT_SECRET2);
  } catch (e) {
    return {};
  }

  if (!decoded._id) {
    return {};
  }

  const newtokens = await tokenRefresh(refreshtoken, ip);

  return newtokens;
};
const tokenRefresh = async (refreshToken, ip) => {
  try {
    let token = null;
    let refresh = null;
    const user = await User.findOne({
      "tokens.token": refreshToken,
    });

    if (!user) {
      return {};
    }

    try {
      token = jwt
        .sign({ _id: user._id, access: "auth" }, global.secrets.JWT_SECRET, {
          expiresIn: global.secrets.AUTH_TOKEN_EXPIRATION,
        })
        .toString();
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e);
      throw new Error(`Find by token error2:${e.message}`);
    }

    let pos = user.tokens.findIndex((q) => q.access === "auth");

    if (pos > -1) {
      user.tokens[pos].token = token;
    } else {
      throw new Error("Find by token error: token pos not found");
    }

    try {
      refresh = jwt
        .sign(
          { _id: user._id, access: "refresh" },
          global.secrets.JWT_SECRET2,
          {
            expiresIn: global.secrets.REFRESH_TOKEN_EXPIRATION,
          }
        )
        .toString();
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(`Find by token error2:${e.message}`);
    }

    pos = user.tokens.findIndex((q) => q.access === "refresh");

    if (pos > -1) {
      user.tokens[pos].token = refresh;
    } else {
      throw new Error("Find by refresh token error: token pos not found");
    }

    await User.findByIdAndUpdate(user._id, {
      $set: {
        ip,
        tokens: user.tokens,
      },
    });

    return { token, refresh };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error("Token Refresh error:", e.message);
  }
};

UserSchema.plugin(timestamps);

const User = mongoose.model("user", UserSchema);

module.exports = User;
