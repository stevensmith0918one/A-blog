const { GraphQLList, GraphQLString, GraphQLBoolean } = require("graphql");

const {
  countByDateType,
  adminInfoType,
  payInfoType,
} = require("../types/Admin");
const AdminResolver = require("../resolvers/Admin");
const FlagType = require("../types/Flag");

module.exports = {
  memberCounts: {
    type: countByDateType,
    resolve(parentValue, _, req) {
      return AdminResolver.memberCounts({ req });
    },
  },

  getPayments: {
    type: new GraphQLList(payInfoType),
    resolve(parentValue, _, req) {
      return AdminResolver.getPayments({ req });
    },
  },

  getFlagsByType: {
    type: new GraphQLList(FlagType),
    args: {
      type: {
        type: GraphQLString,
      },
      isAlert: {
        type: GraphQLBoolean,
      },
    },
    resolve(_, args) {
      return AdminResolver.getFlagsByType(args);
    },
  },

  currentAdmin: {
    type: adminInfoType,
    async resolve(parentValue, _, req) {
      return {
        name: req.user.name,
        territories: req.user.territories,
      };
    },
  },
};
