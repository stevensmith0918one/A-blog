const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLBoolean,
} = require("graphql");

const auth = require("../../config/auth");

// lets import our Flag resolver
const FlagResolver = require("../resolvers/Flag");

module.exports = {
  flagItem: {
    type: GraphQLBoolean,
    args: {
      type: {
        type: new GraphQLNonNull(GraphQLString),
      },
      targetID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      reason: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { type, targetID, reason }, req) {
      if (auth.isAuthenticated(req)) {
        return FlagResolver.flagItem({
          type,
          targetID,
          reason,
          req,
        });
      }
      return null;
    },
  },

  adminDeleteflag: {
    type: GraphQLBoolean,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { id }, req) {
      if (auth.isAuthenticated(req))
        return FlagResolver.adminDeleteflag({ id, req });
      return null;
    },
  },
};
