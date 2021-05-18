const { GraphQLID, GraphQLNonNull } = require("graphql");
const { Types } = require("mongoose");

const auth = require("../../config/auth");

const FilterType = require("../types/Filter");
const FilterResolver = require("../resolvers/Filter");

const { ObjectId } = Types;

module.exports = {
  filter: {
    type: FilterType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { id }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return FilterResolver.getByID(id);
      }
      return {};
    },
  },
  getFilterByUserID: {
    type: FilterType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { id }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return FilterResolver.getByUserID(id, req);
      }
      return {};
    },
  },
};
