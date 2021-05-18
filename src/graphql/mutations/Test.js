const { GraphQLNonNull, GraphQLInt, GraphQLBoolean } = require("graphql");

const TestResolver = require("../resolvers/Test");

module.exports = {
  testload: {
    type: GraphQLBoolean,
    resolve() {
      if (process.env.NODE_ENV !== "production") return TestResolver.testload();
      return null;
    },
  },

  resetTest: {
    type: GraphQLBoolean,
    resolve() {
      if (process.env.NODE_ENV !== "production")
        return TestResolver.resetTest();
      return null;
    },
  },

  massload: {
    type: GraphQLBoolean,
    args: {
      number: {
        type: new GraphQLNonNull(GraphQLInt),
      },
    },
    resolve(_, args) {
      if (process.env.NODE_ENV !== "production")
        return TestResolver.massLoad(args);
      return null;
    },
  },
};
