const { GraphQLString, GraphQLNonNull } = require("graphql");

const auth = require("../../config/auth");
const config = require("../../config/config");

const { demoCountsType } = require("../types/Generic");
const SystemResolver = require("../resolvers/System");

module.exports = {
  version: {
    type: GraphQLString,
    resolve() {
      return `${process.env.NODE_ENV} ${config.appVersion}`;
    },
  },

  getFullLink: {
    type: GraphQLString,
    args: {
      shortenedUrl: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { shortenedUrl }) {
      return SystemResolver.getFullLink(shortenedUrl);
    },
  },

  setFullLink: {
    type: GraphQLString,
    args: {
      url: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve(_, { url }, req) {
      if (auth.isAuthenticated(req)) {
        return SystemResolver.setFullLink(url);
      }
      return {};
    },
  },

  getDemoCounts: {
    type: demoCountsType,
    resolve() {
      return SystemResolver.getDemoCounts();
    },
  },

  hiccup: {
    type: GraphQLString,
    resolve() {
      SystemResolver.hiccup();
      return "done";
    },
  },
};
