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
} = graphql;
const UserType = require("./User");
const ProfileType = require("./Profile");
const User = require("../../models/User");
const { getSignedUrl } = require("../../middlewares/uploadPicture");
const Profile = require("../../models/Profile");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};
// id pic name
const MessageType = new GraphQLObjectType({
  name: "MessageType",
  fields: {
    id: {
      type: GraphQLID,
      default: ObjectId(),
    },
    chatID: {
      type: GraphQLID,
      default: null,
    },
    fromProfile: {
      type: ProfileType,
      default: null,
      async resolve(parentValue) {
        return Profile.findById(parentValue.fromProfile);
      },
    },
    fromUser: {
      type: UserType,
      default: null,
      async resolve(parentValue) {
        return User.findById(parentValue.fromUser);
      },
    },
    profilePic: {
      type: GraphQLString,
      default: "",
      async resolve(parentValue) {
        let picurl;

        if (
          parentValue.type === "alert" ||
          parentValue.type === "left" ||
          parentValue.type === "joinvid" ||
          parentValue.type === "leavevid"
        ) {
          return "";
        }
        if (parentValue.fromUser) {
          const from = await Profile.findOne({
            userIDs: parentValue.fromUser,
            active: true,
          });
          picurl = from ? from.profilePic : "";
        } else {
          const from = await Profile.findById(parentValue.fromProfile);
          picurl = from ? from.profilePic : "";
        }

        if (picurl !== "") {
          const sign = await getSignedUrl({
            key: picurl,
            width: 50,
            height: 50,
            isMobile: parentValue.isMobile,
            isProfile: true,
          });
          return sign;
        }
        return "";
      },
    },
    // TODO: trim this requestr to whats needed add isMobile
    participants: {
      type: new GraphQLList(ProfileType),
      default: [],
      async resolve(parentValue, args, req) {
        // Remember subscrition auth must be enabled
        return Profile.find({
          $and: [
            {
              _id: {
                $ne: req.user.profileID,
                $in: parentValue.participants,
              },
              active: true,
            },
          ],
        });
      },
    },
    invited: {
      type: new GraphQLList(ProfileType),
      default: [],
      async resolve(parentValue, args, req) {
        return Profile.find({
          $and: [
            {
              _id: {
                $ne: req.user.profileID,
                $in: parentValue.invited,
              },
              active: true,
            },
          ],
        });
      },
    },
    text: {
      type: GraphQLString,
      default: "",
      async resolve(parentValue) {
        let { text } = parentValue;
        if (parentValue.type === "img") {
          text = await getSignedUrl({
            key: text,
            width: 300,
            height: 300,
            isMobile: parentValue.isMobile,
          });
        }
        return text;
      },
    },
    fullImg: {
      type: GraphQLString,
      default: "",
      async resolve(parentValue) {
        if (parentValue.type === "img") {
          let { text } = parentValue;
          text = await getSignedUrl({
            key: text,
            maxW: parentValue.maxW,
            maxH: parentValue.maxH,
            isMobile: parentValue.isMobile,
          });
          return text;
        }
        return "";
      },
    },
    type: {
      type: GraphQLString,
      default: "new",
    },
    seenBy: {
      type: GraphQLInt,
      default: 0,
    },
    unSeenCount: {
      type: GraphQLInt,
      default: 0,
    },
    typingText: {
      type: GraphQLString,
      default: "",
    },
    typingList: {
      type: new GraphQLList(GraphQLString),
      default: [],
    },
    blackMember: {
      type: GraphQLBoolean,
      default: false,
      async resolve(parentValue) {
        let isBlk;
        if (parentValue.fromProfile) {
          isBlk = (
            await Profile.findById(parentValue.fromProfile, {
              isBlackMember: 1,
            })
          ).isBlackMember;
        } else if (parentValue.fromUser) {
          isBlk = (
            await User.findById(parentValue.fromUser, {
              "blackMember.active": 1,
            })
          ).blackMember.active;
        } else {
          isBlk = false;
        }

        return isBlk;
      },
    },
    createdAt: {
      type: GraphQLDateTime,
      default: Date.now,
    },
  },
});

module.exports = MessageType;
