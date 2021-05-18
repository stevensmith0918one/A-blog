/* eslint-disable global-require */
const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");
const { ObjectId } = require("mongoose").Types;

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLInt,
} = graphql;

const User = require("../../models/User");
const Flag = require("../../models/Flag");
const Profile = require("../../models/Profile");
const { getSignedUrl } = require("../../middlewares/uploadPicture");

const { photoType } = require("./Generic");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};

const ProfileType = new GraphQLObjectType({
  name: "ProfileType",
  fields: () => {
    const UserType = require("./User");
    const FlagType = require("./Flag");
    return {
      id: {
        type: GraphQLID,
        resolve(parentValue) {
          return parentValue._id;
        },
      },
      users: {
        type: new GraphQLList(UserType),
        resolve(parentValue) {
          return User.find({
            profileID: parentValue._id.toString(),
          });
        },
      },
      sex: {
        type: GraphQLString,
      },
      userDOBs: {
        type: new GraphQLList(GraphQLDateTime),
      },
      updatedAt: {
        type: GraphQLDateTime,
      },
      active: {
        type: GraphQLBoolean,
      },
      isBlackMember: {
        type: GraphQLBoolean,
      },
      about: {
        type: GraphQLString,
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString),
      },
      lastNotification: {
        type: GraphQLString,
      },
      kinks: {
        type: new GraphQLList(GraphQLString),
      },
      blockedProfiles: {
        type: new GraphQLList(ProfileType),
        resolve(parentValue) {
          // TODO: MOVE TO CALL
          return Profile.find({
            _id: parentValue.blockedProfileIDs,
            active: true,
          });
        },
      },
      publicPhotos: {
        type: new GraphQLList(photoType),
        resolve(parentValue) {
          // eslint-disable-next-line no-param-reassign
          parentValue.publicPhotos = parentValue.publicPhotos.map((photo) => {
            return {
              ...photo,
              isMobile: parentValue.isMobile,
              maxW: parentValue.maxW,
              maxH: parentValue.maxH,
            };
          });
          return parentValue.publicPhotos;
        },
      },
      privatePhotos: {
        type: new GraphQLList(photoType),
        resolve(parentValue) {
          // eslint-disable-next-line no-param-reassign
          parentValue.privatePhotos = parentValue.privatePhotos.map((photo) => {
            return {
              ...photo,
              isMobile: parentValue.isMobile,
              maxW: parentValue.maxW,
              maxH: parentValue.maxH,
            };
          });
          return parentValue.privatePhotos;
        },
      },
      cplLink: {
        type: new graphql.GraphQLObjectType({
          name: "CoupleLink",
          fields: {
            linkCode: {
              type: GraphQLString,
            },
            includeMsgs: {
              type: GraphQLString,
            },
            expiration: {
              type: GraphQLDateTime,
            },
          },
        }),
      },
      profilePic: {
        type: GraphQLString,
        async resolve(parentValue) {
          if (parentValue.profilePic !== "") {
            const propic = await getSignedUrl({
              key: parentValue.profilePic,
              width: parentValue.width,
              height: parentValue.height,
              isMobile: parentValue.isMobile,
              isProfile: true,
            });

            return propic;
          }
          return "";
        },
      },
      profileName: {
        type: GraphQLString,
      },
      flags: {
        type: new GraphQLList(FlagType),
        resolve(parentValue) {
          return Flag.find({
            _id: parentValue.flagIDs,
          });
        },
      },
      likeProfiles: {
        type: new GraphQLList(ProfileType),
        resolve(parentValue) {
          return Profile.find({
            _id: parentValue.likeIDs,
            active: true,
          });
        },
      },
      publicCode: {
        type: GraphQLString,
      },
      showOnline: {
        type: GraphQLBoolean,
        async resolve(parentValue) {
          return parentValue.discoverySettings.showOnline;
        },
      },
      online: {
        type: GraphQLBoolean,
        async resolve(parentValue) {
          return parentValue.discoverySettings.showOnline
            ? parentValue.online
            : false;
        },
      },
      likedByMe: {
        type: GraphQLBoolean,
      },
      msgdByMe: {
        type: GraphQLBoolean,
      },
      distance: {
        type: GraphQLInt,
        resolve(parentValue) {
          return Math.round(parentValue.distance);
        },
      },
    };
  },
});

module.exports = ProfileType;
