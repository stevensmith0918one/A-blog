const {
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
  GraphQLNonNull,
} = require("graphql");
const { Types } = require("mongoose");

const auth = require("../../config/auth");

const ProfileType = require("../types/Profile");
const ProfileResolver = require("../resolvers/Profile");
const { searchProfileResType } = require("../types/Generic");

const { ObjectId } = Types;

module.exports = {
  profile: {
    type: ProfileType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
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
    resolve(_, { id, isMobile, maxW, maxH }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return ProfileResolver.getByID(id, req).then((data) => {
          if (data) {
            /* eslint no-param-reassign: 0 */
            data.width = 225;
            data.height = 225;
            data.isMobile = isMobile === "true";
            data.maxW = maxW;
            data.maxH = maxH;
          }
          return data;
        });
      }
      return {};
    },
  },

  generateCode: {
    type: GraphQLString,
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.generateCode(req);
      }
      return {};
    },
  },

  searchProfiles: {
    type: searchProfileResType,
    args: {
      searchType: { type: GraphQLString },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      skip: { type: GraphQLInt },
      city: { type: GraphQLString },
      long: { type: new GraphQLNonNull(GraphQLFloat) },
      lat: { type: new GraphQLNonNull(GraphQLFloat) },
      distance: { type: new GraphQLNonNull(GraphQLInt) },
      ageRange: { type: new GraphQLNonNull(new GraphQLList(GraphQLInt)) },
      interestedIn: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    resolve(_, args, req) {
      if (auth.isAuthenticated(req)) {
        return ProfileResolver.searchProfiles(args, req).then((data) => {
          data.profiles.forEach((el) => {
            el.width = 125;
            el.height = 142;
            el.isMobile = args.isMobile === "true";
          });
          data.featuredProfiles.forEach((el) => {
            el.width = 232;
            el.height = 255;
            el.isMobile = args.isMobile === "true";
          });
          return data;
        });
      }
      return {};
    },
  },
};
