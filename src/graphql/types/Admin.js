const GraphQL = require("graphql");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
} = GraphQL;

exports.countByDateType = new GraphQLObjectType({
  name: "countByDateType",
  fields: () => ({
    days: {
      type: new GraphQLList(GraphQLString),
    },
    signups: {
      type: new GraphQLList(GraphQLInt),
    },
    blkSignups: {
      type: new GraphQLList(GraphQLInt),
    },
  }),
});

exports.adminInfoType = new GraphQLObjectType({
  name: "AdminInfo",
  description: "Admin Info for session",
  fields: {
    name: {
      type: GraphQLString,
    },
    territories: {
      type: new GraphQLList(GraphQLString),
    },
  },
});

exports.payInfoType = new GraphQLObjectType({
  name: "payInfoType",
  fields: () => ({
    id: {
      type: GraphQLString,
    },
    date: {
      type: GraphQLString,
    },
    type: {
      type: GraphQLString,
    },
    acctNum: {
      type: GraphQLString,
    },
    amount: {
      type: GraphQLFloat,
    },
  }),
});
