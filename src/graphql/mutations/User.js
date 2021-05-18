const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
  GraphQLFloat,
} = require("graphql");
const validator = require("validator");

const auth = require("../../config/auth");
const config = require("../../config/config");
const {
  sexOptions,
  kinkOptions,
  sexSingleOptions,
  sexualityOptions,
  langOptions,
} = require("../../config/listOptions");

const FBResolver = require("../resolvers/FB");
const { tokenType } = require("../types/Generic");
const UserResolver = require("../resolvers/User");

module.exports = {
  login: {
    type: new GraphQLList(tokenType),
    description: "Login User",
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Phone number login",
      },
      password: {
        type: GraphQLString,
      },
    },
    resolve(_, args) {
      if (global.secrets.NODE_ENV !== "production") {
        if (!validator.isIn(args.phone, config.validPhoneNumbers)) {
          throw new TypeError("Client: Phone number is invalid.");
        }
        if (args.password) {
          if (
            !validator.isAlphanumeric(validator.blacklist(args.password, " "))
          ) {
            throw new Error(
              "Client: Password may only contain letters and numbers."
            );
          }
        }
        return UserResolver.login(args);
      }
      return null;
    },
  },

  fbResolve: {
    type: new GraphQLList(tokenType),
    args: {
      csrf: {
        type: new GraphQLNonNull(GraphQLString),
      },
      code: {
        type: new GraphQLNonNull(GraphQLString),
      },
      isCreate: {
        type: new GraphQLNonNull(GraphQLBoolean),
      },
      isReset: {
        type: GraphQLBoolean,
      },
      email: {
        type: GraphQLString,
        description: "Enter email",
      },
      password: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
        description: "Enter your name, Cannot be left empty",
      },
      lang: {
        type: new GraphQLNonNull(GraphQLString),
      },
      dob: {
        type: GraphQLString,
      },
      sex: {
        type: GraphQLString,
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString),
      },
      ref: {
        type: GraphQLString,
      },
      cid: {
        type: GraphQLString,
      },
      isCouple: {
        type: GraphQLBoolean,
      },
    },
    resolve(
      _,
      {
        csrf,
        code,
        isCreate,
        isReset,
        email,
        password,
        username,
        lang,
        dob,
        sex,
        interestedIn,
        ref,
        cid,
        isCouple,
      },
      req
    ) {
      const createData = {
        email,
        password,
        username,
        lang,
        dob,
        sex,
        interestedIn,
        ref,
        cid,
      };

      if (isCreate && createData) {
        if (!validator.isEmail(createData.email)) {
          throw new Error("Client: Invalid email.");
        }

        if (!validator.isIn(lang, langOptions)) {
          throw new TypeError("Client: Language selection is invalid.");
        }
        interestedIn.forEach((element) => {
          if (!validator.isIn(element, sexOptions)) {
            throw new Error("Client: Invalid interested in selection.");
          }
        });
        if (!validator.isIn(sex, sexSingleOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }
        if (
          !validator.isLength(createData.username, {
            min: 3,
            max: 120,
          })
        ) {
          throw new Error(
            "Client: Event description should be between 3 and 120 characters."
          );
        }

        if (
          !validator.isAlphanumeric(
            validator.blacklist(createData.username, " ")
          )
        ) {
          throw new Error(
            "Client: Username may only contain letters and numbers."
          );
        }

        if (createData.password) {
          if (
            !validator.isAlphanumeric(
              validator.blacklist(createData.password, " ")
            )
          ) {
            throw new Error(
              "Client: Password may only contain letters and numbers."
            );
          }
        }

        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setFullYear(date.getFullYear() - 18);
        if (validator.isAfter(createData.dob, date.toDateString())) {
          throw new Error("Client: You must be at least 18 years old to join.");
        }
        if (!validator.isIn(createData.sex, sexSingleOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }

        return FBResolver.fbResolve({
          csrf,
          code,
          createData,
          isCouple,
          isCreate,
          password,
        });
      }

      if (isReset) {
        return FBResolver.fbResetPhone({ csrf, code, password }, req);
      }

      return FBResolver.fbResolve({ csrf, code, password });
    },
  },

  fbResetPhone: {
    type: GraphQLBoolean,
    args: {
      csrf: {
        type: new GraphQLNonNull(GraphQLString),
      },
      code: {
        type: new GraphQLNonNull(GraphQLString),
      },
      password: {
        type: GraphQLString,
      },
      token: {
        type: GraphQLString,
      },
    },
    async resolve(_, { csrf, code, password, token }, req) {
      return FBResolver.fbResetPhone({ csrf, code, password, token }, req);
    },
  },

  updateSettings: {
    type: GraphQLBoolean,
    args: {
      distance: {
        type: GraphQLInt,
      },
      distanceMetric: {
        type: GraphQLString,
      },
      ageRange: {
        type: new GraphQLList(GraphQLInt),
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString),
      },
      city: {
        type: GraphQLString,
      },
      lang: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString,
      },
      sex: {
        type: GraphQLString,
      },
      email: {
        type: GraphQLString,
      },
      long: {
        type: GraphQLFloat,
      },
      lat: {
        type: GraphQLFloat,
      },
      visible: {
        type: GraphQLBoolean,
      },
      newMsgNotify: {
        type: GraphQLBoolean,
      },
      emailNotify: {
        type: GraphQLBoolean,
      },
      showOnline: {
        type: GraphQLBoolean,
      },
      likedOnly: {
        type: GraphQLBoolean,
      },
      vibrateNotify: {
        type: GraphQLBoolean,
      },
      about: {
        type: GraphQLString,
      },
      profilePic: {
        type: GraphQLString,
      },
      sexuality: {
        type: GraphQLString,
      },
      kinks: {
        type: new GraphQLList(GraphQLString),
      },
      publicPhotoList: {
        type: new GraphQLList(GraphQLString),
      },
      privatePhotoList: {
        type: new GraphQLList(GraphQLString),
      },
      includeMsgs: {
        type: GraphQLBoolean,
      },
    },
    resolve(_, args, req) {
      if (auth.isAuthenticated(req)) {
        const {
          ageRange,
          lang,
          username,
          email,
          sex,
          interestedIn,
          about,
          kinks,
          sexuality,
        } = args;

        if (username) {
          if (
            !validator.isLength(username, {
              min: 3,
              max: 30,
            })
          ) {
            throw new Error(
              "Client: Username should be between 3 and 30 characters."
            );
          } else if (
            !validator.isAlphanumeric(validator.blacklist(username, " "))
          ) {
            throw new Error(
              "Client: Username may only contain letters and numbers."
            );
          }
        }

        if (
          about &&
          !validator.isLength(about, {
            max: 2500,
          })
        ) {
          throw new Error(
            "Client: Bio should be a maximum of 2500 characters."
          );
        }
        if (email && !validator.isEmail(email)) {
          throw new Error("Client: Email Invalid.");
        }

        if (sex && !validator.isIn(sex, sexSingleOptions)) {
          throw new TypeError("Client: Sex is invalid.");
        }
        if (interestedIn) {
          interestedIn.forEach((element) => {
            if (!validator.isIn(element, sexOptions)) {
              throw new Error("Client: Invalid interested in selection.");
            }
          });
        }

        if (lang && !validator.isIn(lang, langOptions)) {
          throw new TypeError("Client: Language selection is invalid.");
        }

        if (sexuality && !validator.isIn(sexuality, sexualityOptions)) {
          throw new TypeError("Client: Sexuality selection is invalid.");
        }

        if (kinks) {
          kinks.forEach((element) => {
            if (!validator.isIn(element, kinkOptions)) {
              throw new Error("Client: Invalid kink in selection.");
            }
          });
        }

        if (
          ageRange &&
          (ageRange[0] < 18 || ageRange[1] > 80 || ageRange[0] > ageRange[1])
        ) {
          throw new Error("Client: Invalid age range selection.");
        }
        return UserResolver.updateSettings(args, req);
      }
      return null;
    },
  },

  submitPhoto: {
    type: GraphQLBoolean,
    args: {
      image: {
        type: new GraphQLNonNull(GraphQLString),
      },
      type: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { type, image }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.submitPhoto({
          type,
          image,
          req,
        });
      }
      return null;
    },
  },

  deleteUser: {
    type: GraphQLBoolean,
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.deleteUser(req.user._id);
      }
      return null;
    },
  },

  resetPassword: {
    type: GraphQLBoolean,
    args: {
      password: {
        type: new GraphQLNonNull(GraphQLString),
      },
      token: {
        type: GraphQLString,
      },
      currPassword: {
        type: GraphQLString,
      },
    },
    resolve(_, args, req) {
      const { password, token } = args;
      if (password) {
        if (!validator.isAlphanumeric(validator.blacklist(password, " "))) {
          throw new Error(
            "Client: Password may only contain letters and numbers."
          );
        }
      }

      if (!token) {
        if (auth.isAuthenticated(req)) {
          /* eslint no-param-reassign: 0 */
          args.userID = req.user._id;
        }
      }
      return FBResolver.resetPassword(args, req);
    },
  },

  createSubcription: {
    type: GraphQLBoolean,
    args: {
      ccnum: {
        type: new GraphQLNonNull(GraphQLString),
      },
      exp: {
        type: new GraphQLNonNull(GraphQLString),
      },
      cvc: {
        type: new GraphQLNonNull(GraphQLString),
      },
      fname: {
        type: new GraphQLNonNull(GraphQLString),
      },
      lname: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    async resolve(_, { ccnum, exp, cvc, fname, lname }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.createSubscription({
          ccnum,
          exp,
          cvc,
          fname,
          lname,
          req,
        });
      }
      return null;
    },
  },

  cancelSubcription: {
    type: GraphQLBoolean,
    async resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.cancelSubcription({ req });
      }
      return null;
    },
  },

  readNotification: {
    type: GraphQLBoolean,
    args: {
      notificationID: {
        type: new GraphQLNonNull(GraphQLString),
      },
      both: {
        type: GraphQLBoolean,
      },
    },
    resolve(_, { notificationID, both }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.updateNotifications({
          notificationIDs: [notificationID],
          both,
          req,
        });
      }
      return null;
    },
  },

  updateLocation: {
    type: GraphQLBoolean,
    args: {
      lat: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
      long: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
      city: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { lat, long, city }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.updateLocation({
          lat,
          long,
          city,
          req,
        });
      }
      return null;
    },
  },

  seenTour: {
    type: GraphQLBoolean,
    args: {
      tour: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { tour }, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.seenTour({
          tour,
          req,
        });
      }
      return null;
    },
  },

  sendPhoneResetEmail: {
    type: GraphQLBoolean,
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, args) {
      return UserResolver.sendPhoneResetEmail(args);
    },
  },

  sendPasswordResetEmail: {
    type: GraphQLBoolean,
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString),
      },
      email: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, args) {
      return UserResolver.sendPasswordResetEmail(args);
    },
  },

  messageAdmin: {
    type: GraphQLBoolean,
    args: {
      name: {
        type: GraphQLString,
      },
      email: {
        type: GraphQLString,
      },
      text: {
        type: new GraphQLNonNull(GraphQLString),
      },
      type: {
        type: GraphQLString,
      },
    },
    resolve(_, { name, email, text, type }, req) {
      if (email && !validator.isEmail(email)) {
        throw new Error("Client: Invalid email.");
      }

      if (
        name &&
        !validator.isLength(name, {
          min: 1,
          max: 120,
        })
      ) {
        throw new Error(
          "Client: Please keep name between 1 and 120 characters."
        );
      }

      if (name && !validator.isAlpha(validator.blacklist(name, " "))) {
        throw new Error(
          "Client: Username may only contain letters and numbers."
        );
      }
      return UserResolver.messageAdmin({
        name,
        email,
        text,
        type,
        req,
      });
    },
  },

  resendVerEMail: {
    type: GraphQLBoolean,
    args: {},
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.resendVerEMail({
          req,
        });
      }
      return null;
    },
  },

  noticesSeen: {
    type: GraphQLBoolean,
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return UserResolver.noticesSeen(req);
      }
      return null;
    },
  },
};
