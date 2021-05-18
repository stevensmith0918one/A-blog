const { GraphQLID, GraphQLString, GraphQLList } = require("graphql");
const { Types } = require("mongoose");

const FlagType = require("../types/Flag");
const FlagResolver = require("../resolvers/Flag");

const { ObjectId } = Types;

module.exports = {
  flag: {
    type: new GraphQLList(FlagType),
    args: {
      id: {
        type: GraphQLID,
      },
      targetID: {
        type: GraphQLID,
      },
      type: {
        type: GraphQLString,
      },
      reason: {
        type: GraphQLString,
      },
    },
    resolve(_, args) {
      if (process.env.NODE_ENV !== "production") {
        if (args.id && !ObjectId.isValid(args.id)) {
          throw new Error("Client: ID Invalid.");
        } else if (args.targetID && !ObjectId.isValid(args.targetID)) {
          throw new Error("Client: Target ID Invalid.");
        }
        return FlagResolver.getFlags(args);
      }
      return {};
    },
  },
};
