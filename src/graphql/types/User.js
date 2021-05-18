const { GraphQLDateTime } = require("graphql-iso-date");

const graphql = require("graphql");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
} = graphql;

const { ObjectId } = require("mongoose").Types;
const ProfileType = require("./Profile");
const FlagType = require("./Flag");
const FilterType = require("./Filter");
const { tokenType, locationType, verificationType } = require("./Generic");

const Profile = require("../../models/Profile");
const Flag = require("../../models/Flag");
const Filter = require("../../models/Filter");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};
const UserType = new GraphQLObjectType({
  name: "UserType",
  fields: {
    id: {
      type: GraphQLID,
    },
    email: {
      type: GraphQLString,
    },
    dob: {
      type: GraphQLDateTime,
    },
    sex: {
      type: GraphQLString,
    },
    profile: {
      type: ProfileType,
      resolve(parentValue) {
        return Profile.findOne({
          userIDs: parentValue._id,
          active: true,
        });
      },
    },
    username: {
      type: GraphQLString,
    },
    sharedApp: {
      type: GraphQLBoolean,
    },
    active: {
      type: GraphQLBoolean,
    },
    flags: {
      type: new GraphQLList(FlagType),
      resolve(parentValue) {
        return Flag.find({
          _id: parentValue.flagIDs,
        });
      },
    },
    filter: {
      type: FilterType,
      resolve(parentValue) {
        return Filter.findOne({
          _id: parentValue.filterID,
        });
      },
    },
    blackMember: {
      type: new graphql.GraphQLObjectType({
        name: "BlackMembershipType",
        fields: {
          active: {
            type: GraphQLBoolean,
          },
          renewalDate: {
            type: GraphQLDateTime,
          },
        },
      }),
    },
    isProfileOK: {
      type: GraphQLBoolean,
    },
    isEmailOK: {
      type: GraphQLBoolean,
    },
    appVersion: {
      type: GraphQLString,
    },
    lastNotification: {
      type: GraphQLString,
    },
    notificationRules: {
      type: new graphql.GraphQLObjectType({
        name: "NotificationRuleType",
        fields: {
          newMsgNotify: {
            type: GraphQLBoolean,
          },
          vibrateNotify: {
            type: GraphQLBoolean,
          },
          emailNotify: {
            type: GraphQLBoolean,
          },
        },
      }),
    },
    verifications: {
      type: new graphql.GraphQLObjectType({
        name: "VerificationsType",
        fields: {
          photoVer: {
            type: verificationType,
          },
          stdVer: {
            type: verificationType,
          },
          acctVer: {
            type: verificationType,
          },
        },
      }),
    },
    location: {
      type: locationType,
    },
    tokens: {
      type: new GraphQLList(tokenType),
    },
    sexuality: {
      type: GraphQLString,
    },
    createdAt: {
      type: GraphQLDateTime,
    },
  },
});

module.exports = UserType;
