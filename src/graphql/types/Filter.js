const graphql = require("graphql");

const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt } = graphql;
const { ObjectId } = require("mongoose").Types;

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};
const FilterOptionsType = new GraphQLObjectType({
  name: "FilterOptionsType",
  fields: {
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
  },
});

const FilterType = new GraphQLObjectType({
  name: "FilterType",
  fields: () => {
    // eslint-disable-next-line global-require
    const UserType = require("./User");
    return {
      userID: {
        type: GraphQLString,
      },
      searchParams: {
        type: FilterOptionsType,
      },
      blocked: {
        type: new GraphQLList(UserType),
      },
    };
  },
});

module.exports = FilterType;
