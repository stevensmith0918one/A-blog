const { GraphQLDateTime } = require("graphql-iso-date");

const graphql = require("graphql");

const {
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
  GraphQLBoolean,
  GraphQLString,
} = graphql;

const { ObjectId } = require("mongoose").Types;
const ProfileType = require("./Profile");
const { EventType } = require("./Event");
const FlagType = require("./Flag");
const MessageType = require("./Message");

const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};

const ChatType = new GraphQLObjectType({
  name: "ChatType",
  fields: {
    id: {
      type: GraphQLID,
    },
    name: {
      type: GraphQLString,
    },
    participants: {
      type: new GraphQLList(ProfileType),
      resolve(parentValue) {
        return Profile.find({
          _id: parentValue.participants,
          active: true,
        }).then((data) => {
          // SET LAST SEEN
          if (data) {
            // eslint-disable-next-line no-param-reassign
            data.width = parentValue.width;
            // eslint-disable-next-line no-param-reassign
            data.height = parentValue.height;
            // eslint-disable-next-line no-param-reassign
            data.isMobile = parentValue.isMobile;
          }
          return data;
        });
      },
    },
    event: {
      type: EventType,
      resolve(parentValue) {
        return Event.findOne({
          _id: parentValue.eventID,
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
    ownerProfile: {
      type: ProfileType,
      resolve(parentValue) {
        return Profile.findOne({
          _id: parentValue.ownerProfileID,
          active: true,
        }).then((data) => {
          if (data) {
            // eslint-disable-next-line no-param-reassign
            data.width = 50;
            // eslint-disable-next-line no-param-reassign
            data.height = 50;
            // eslint-disable-next-line no-param-reassign
            data.isMobile = parentValue.isMobile;
          }
          return data;
        });
      },
    },
    flags: {
      type: new GraphQLList(FlagType),
      resolve(parentValue) {
        return Flag.find({
          _id: parentValue.flagIDs,
        });
      },
    },
    createdAt: {
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
    messages: {
      type: new GraphQLList(MessageType),
      resolve(parentValue) {
        const messages = parentValue.messages.map((msg) => {
          return {
            ...msg.toObject(),
            isMobile: parentValue.isMobile,
            maxW: parentValue.maxW,
            maxH: parentValue.maxH,
          };
        });

        return messages;
      },
    },
    blocked: {
      type: new GraphQLList(GraphQLID),
    },
    active: {
      type: GraphQLBoolean,
      default: true,
    },
    typingText: {
      type: GraphQLString,
      default: "",
    },
    typingList: {
      type: new GraphQLList(GraphQLString),
      default: [],
    },
  },
});

module.exports = ChatType;
