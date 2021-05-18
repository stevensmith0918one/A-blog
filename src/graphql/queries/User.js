const {
  GraphQLList,
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
} = require("graphql");
const moment = require("moment");
const { Types } = require("mongoose");

const auth = require("../../config/auth");
const config = require("../../config/config");

const TestResolver = require("../resolvers/Test");
const UserType = require("../types/User");
const User = require("../../models/User");
const SettingsType = require("../types/Settings");
const {
  userInfoType,
  notificationType,
  overviewCountsType,
} = require("../types/Generic");
const {
  getByID,
  getSettings,
  getCounts,
  getNotifications,
  confirmEmail,
} = require("../resolvers/User");
const { updateLastActive, toggleOnline } = require("../resolvers/Profile");
const { getAnnouncement } = require("../resolvers/System");

const { ObjectId } = Types;

module.exports = {
  testCall: {
    type: new GraphQLList(GraphQLString),
    args: {
      isCheck: {
        type: GraphQLBoolean,
      },
    },
    resolve(_, { isCheck }) {
      if (process.env.NODE_ENV !== "production") {
        return TestResolver.testCall(isCheck);
      }
      return [];
    },
  },

  user: {
    type: UserType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { id }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return getByID(id);
      }
      return {};
    },
  },

  version: {
    type: GraphQLString,
    resolve() {
      return config.appVersion;
    },
  },

  currentuser: {
    type: userInfoType,
    args: {
      isMobile: {
        type: GraphQLString,
      },
    },
    async resolve(_, { isMobile }, req) {
      if (auth.isAuthenticated(req)) {
        let announcement = null;

        if (!req.user.online) {
          toggleOnline(req);
        }

        if (
          !req.user.lastAnnounceDate ||
          moment(req.user.lastAnnounceDate).isBefore(Date.now(), "day")
        ) {
          announcement = await getAnnouncement();
          await User.findByIdAndUpdate(req.user._id, {
            $set: {
              lastAnnounceDate: new Date(),
            },
          });
        }

        if (
          !moment(req.user.activity.likesSent.date).isSame(Date.now(), "day") ||
          !moment(req.user.activity.msgsSent.date).isSame(Date.now(), "day")
        ) {
          await User.findByIdAndUpdate(req.user._id, {
            $set: {
              "activity.likesSent.count": 0,
              "activity.likesSent.date": new Date(),
              "activity.msgsSent.count": 0,
              "activity.msgsSent.date": new Date(),
            },
          });
        }

        updateLastActive(req);
        return {
          userID: req.user._id,
          username: req.user.username,
          profileID: req.user.profileID,
          blackMember: req.user.blackMember,
          location: req.user.location,
          isProfileOK: req.user.isProfileOK,
          isEmailOK: req.user.isEmailOK,
          coupleProfileName: req.user.isCouple ? req.user.profileName : null,
          lang: req.user.lang,
          distanceMetric: req.user.distanceMetric,
          active: req.user.active,
          captchaReq: req.user.captchaReq,
          likesSent: req.user.activity.likesSent.count,
          msgsSent: req.user.activity.msgsSent.count,
          createdAt: req.user.createdAt,
          profilePic: req.user.profilePic,
          announcement,
          isMobile,
        };
      }
      return {};
    },
  },

  getSettings: {
    type: SettingsType,
    args: {
      isMobile: {
        type: GraphQLString,
      },
      maxW: {
        type: GraphQLInt,
      },
      maxH: {
        type: GraphQLInt,
      },
    },
    resolve(_, { isMobile, maxH, maxW }, req) {
      if (auth.isAuthenticated(req)) {
        return getSettings(req).then((data) => {
          /* eslint no-param-reassign: 0 */
          data.isMobile = isMobile === "true";
          data.maxW = maxW;
          data.maxH = maxH;
          return data;
        });
      }
      return {};
    },
  },

  getCounts: {
    type: overviewCountsType,
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return getCounts({ req });
      }
      return {};
    },
  },

  getNotifications: {
    type: new GraphQLObjectType({
      name: "NotficationListType",
      fields: {
        notifications: {
          type: new GraphQLList(notificationType),
        },
        total: {
          type: GraphQLInt,
        },
      },
    }),
    args: {
      limit: {
        type: new GraphQLNonNull(GraphQLInt),
      },
      skip: {
        type: GraphQLInt,
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    resolve(_, { limit, skip, isMobile }, req) {
      if (auth.isAuthenticated(req)) {
        return getNotifications({ limit, skip, req }).then((data) => {
          const isMobileBool = isMobile === "true";
          data.notifications = data.notifications.map((notification) => {
            return { ...notification.toObject(), isMobile: isMobileBool };
          });
          return data;
        });
      }
      return {};
    },
  },

  confirmEmail: {
    type: GraphQLBoolean,
    args: {
      token: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { token }) {
      return confirmEmail({
        token,
      });
    },
  },
};
