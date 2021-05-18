const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");
const { ObjectId } = require("mongoose").Types;

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
} = graphql;

const ProfileType = require("./Profile");
const FlagType = require("./Flag");
const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const { getSignedUrl } = require("../../middlewares/uploadPicture");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};
const EventType = new GraphQLObjectType({
  name: "EventType",
  fields: {
    id: {
      type: GraphQLID,
      resolve(parentValue) {
        return parentValue._id;
      },
    },
    eventname: {
      type: GraphQLString,
    },
    image: {
      type: GraphQLString,
      async resolve(parentValue) {
        if (parentValue.image) {
          return getSignedUrl({
            key: parentValue.image,
            width: parentValue.width,
            height: parentValue.height,
            isMobile: parentValue.isMobile,
          });
        }
        return "";
      },
    },
    description: {
      type: GraphQLString,
    },
    type: {
      type: GraphQLString,
    },
    startTime: {
      type: GraphQLDateTime,
    },
    endTime: {
      type: GraphQLDateTime,
    },
    tagline: {
      type: GraphQLString,
    },
    address: {
      type: GraphQLString,
    },
    interestedIn: {
      type: new GraphQLList(GraphQLString),
    },
    kinks: {
      type: new GraphQLList(GraphQLString),
    },
    maxDistance: {
      type: GraphQLInt,
    },
    active: {
      type: GraphQLBoolean,
    },
    participants: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue) {
        return Profile.find({
          _id: parentValue.participants,
          active: true,
        }).then((data) => {
          data.forEach((el) => {
            // eslint-disable-next-line no-param-reassign
            el.width = 32;
            // eslint-disable-next-line no-param-reassign
            el.height = 32;
            // eslint-disable-next-line no-param-reassign
            el.isMobile = parentValue.isMobile;
          });
          return data;
        });
      },
    },
    invited: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue) {
        return Profile.find({
          _id: parentValue.invited,
          active: true,
        });
      },
    },
    blocked: {
      type: new GraphQLList(GraphQLID),
    },
    flags: {
      type: new GraphQLList(FlagType),
      resolve(parentValue) {
        return Flag.find({
          _id: parentValue.flagIDs,
        });
      },
    },
    chatID: {
      type: GraphQLID,
    },
    ownerProfile: {
      type: ProfileType,
      resolve(parentValue) {
        return Profile.findById(parentValue.ownerProfileID).then((data) => {
          if (data) {
            // eslint-disable-next-line no-param-reassign
            data.width = parentValue.ownerProWidth;
            // eslint-disable-next-line no-param-reassign
            data.height = parentValue.ownerProHeight;
            // eslint-disable-next-line no-param-reassign
            data.isMobile = parentValue.isMobile;
          }
          return data;
        });
      },
    },
    distance: {
      type: GraphQLFloat,
      async resolve(parentValue) {
        return Math.round(parentValue.distance);
      },
    },
    lat: {
      type: GraphQLFloat,
    },
    long: {
      type: GraphQLFloat,
    },
    createdAt: {
      type: GraphQLDateTime,
    },
  },
});

module.exports = { EventType };
