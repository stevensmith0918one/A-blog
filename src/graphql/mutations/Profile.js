const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLBoolean,
} = require("graphql");

const auth = require("../../config/auth");

const { s3PayloadType, linkType } = require("../types/Generic");
const ProfileResolver = require("../resolvers/Profile");

module.exports = {
  linkProfile: {
    type: linkType,
    args: {
      code: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { code }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature."
          );
        }
        return ProfileResolver.linkProfile({
          code,
          req,
        });
      }
      return null;
    },
  },

  likeProfile: {
    type: GraphQLString,
    args: {
      toProfileID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { toProfileID }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature."
          );
        }
        return ProfileResolver.likeProfile({ toProfileID, req });
      }
      return null;
    },
  },

  unlinkProfile: {
    type: GraphQLBoolean,
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req))
        return ProfileResolver.unlinkProfile({ profileID: req.user.profileID });
      return null;
    },
  },

  signS3: {
    type: s3PayloadType,
    args: {
      filetype: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { filetype }, req) {
      if (auth.isAuthenticated(req))
        return ProfileResolver.signS3({ filetype, userID: req.user._id });
      return null;
    },
  },

  blockProfile: {
    type: GraphQLBoolean,
    args: {
      blockedProfileID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { blockedProfileID }, req) {
      if (auth.isAuthenticated(req))
        return ProfileResolver.blockProfile({ blockedProfileID, req });
      return null;
    },
  },

  convertToCouple: {
    type: GraphQLBoolean,
    args: {
      coupleProID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { coupleProID }, req) {
      if (auth.isAuthenticated(req))
        return ProfileResolver.convertToCouple({ coupleProID, req });
      return null;
    },
  },
};
