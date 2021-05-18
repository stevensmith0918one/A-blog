const GraphQL = require("graphql");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
} = GraphQL;
const { GraphQLDateTime } = require("graphql-iso-date");
const User = require("../../models/User");
const UserType = require("./User");
const { photoType } = require("./Generic");
const { getSignedUrl } = require("../../middlewares/uploadPicture");

const SettingsType = new GraphQLObjectType({
  name: "Settings",
  description: "User/Profile Settings",
  fields: () => {
    return {
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
      lat: {
        type: GraphQLFloat,
      },
      long: {
        type: GraphQLFloat,
      },
      profilePic: {
        type: GraphQLString,
      },
      profilePicUrl: {
        type: GraphQLString,
        async resolve(parentValue) {
          if (parentValue.profilePic !== "") {
            const sign = await getSignedUrl({
              key: parentValue.profilePic,
              width: 90,
              height: 90,
              isMobile: parentValue.isMobile,
              isProfile: true,
            });
            return sign;
          }
          return "";
        },
      },
      lang: {
        type: GraphQLString,
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
      couplePartner: {
        type: GraphQLString,
      },
      includeMsgs: {
        type: GraphQLBoolean,
      },
      users: {
        type: new GraphQLList(UserType),
        resolve(parentValue) {
          // TODO: MOVE THIS TO CALL
          return User.find({
            _id: parentValue.users,
          });
        },
      },
      publicPhotos: {
        type: new GraphQLList(photoType),
        resolve(parentValue) {
          // eslint-disable-next-line no-param-reassign
          parentValue.publicPhotos = parentValue.publicPhotos.map((photo) => {
            return {
              ...photo.toObject(),
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
              ...photo.toObject(),
              isMobile: parentValue.isMobile,
              maxW: parentValue.maxW,
              maxH: parentValue.maxH,
            };
          });
          return parentValue.privatePhotos;
        },
      },
      about: {
        type: GraphQLString,
      },
      kinks: {
        type: new GraphQLList(GraphQLString),
      },
      sexuality: {
        type: GraphQLString,
      },
      lastActive: {
        type: GraphQLDateTime,
      },
      password: {
        type: GraphQLString,
      },
      ccLast4: {
        type: GraphQLString,
      },
      verifications: {
        type: new GraphQLObjectType({
          name: "userVerificationType",
          fields: {
            photo: {
              type: GraphQLString,
            },
            std: {
              type: GraphQLString,
            },
          },
        }),
      },
    };
  },
});
module.exports = SettingsType;
