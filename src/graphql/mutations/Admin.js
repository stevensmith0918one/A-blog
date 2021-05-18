const GraphQL = require("graphql");
const validator = require("validator");
const { GraphQLDateTime } = require("graphql-iso-date");

const auth = require("../../config/auth");

const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
  GraphQLID,
} = GraphQL;

// lets import our user type
const { tokenType } = require("../types/Generic");

// lets import our user resolver
const AdminResolver = require("../resolvers/Admin");

module.exports = {
  adminLogin: {
    type: new GraphQLList(tokenType),
    description: "Login User",
    args: {
      phone: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Phone number login",
      },
    },
    resolve(_, args) {
      if (!validator.isIn(args.phone, ["1", "2", "3", "4", "5"])) {
        throw new TypeError("Client: Phone number is Invalid");
      }
      return AdminResolver.login(args);
    },
  },

  adminDeleteEvent: {
    type: GraphQLBoolean,
    args: {
      eventID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(_, { eventID }, req) {
      if (auth.isAuthenticated(req)) {
        return AdminResolver.adminDeleteEvent({
          eventID,
          req,
        });
      }
      return {};
    },
  },
  adminCreate: {
    type: new GraphQLList(tokenType),
    description: "Add new User",
    args: {
      email: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter email",
      },
      name: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter your name, Cannot be left empty",
      },
      phone: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Enter mobile number",
      },
    },
    resolve(parentValue, args) {
      if (
        !validator.isIn(args.phone, ["1", "2", "3", "4", "5"]) &&
        !validator.isMobilePhone(args.phone)
      ) {
        throw new Error("Client: Invalid phone number.");
      }

      if (!validator.isEmail(args.email)) {
        throw new Error("Client: Invalid phone number.");
      }

      if (
        !validator.isLength(args.name, {
          min: 3,
          max: 120,
        })
      ) {
        throw new Error("Client: Name should be between 3 and 120 characters.");
      }

      if (!validator.isAlphanumeric(validator.blacklist(args.name, " "))) {
        throw new Error(
          "Client: Username may only contain letters and numbers."
        );
      }

      return AdminResolver.create(args);
    },
  },

  setVerification: {
    type: GraphQLBoolean,
    args: {
      type: {
        type: new GraphQLNonNull(GraphQLString),
        description: "Phone number login",
      },
      active: {
        type: new GraphQLNonNull(GraphQLBoolean),
        description: "Phone number login",
      },
      userID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.setVerification(args);
    },
  },

  addPayment: {
    type: GraphQLBoolean,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
      amount: {
        type: new GraphQLNonNull(GraphQLInt),
      },
      type: {
        type: new GraphQLNonNull(GraphQLString),
      },
      acctNum: {
        type: new GraphQLNonNull(GraphQLString),
      },
      date: {
        type: new GraphQLNonNull(GraphQLDateTime),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.addPayment(args);
    },
  },

  toggleAlertFlag: {
    type: GraphQLBoolean,
    args: {
      flagID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.toggleAlertFlag(args);
    },
  },

  toggleActive: {
    type: GraphQLBoolean,
    args: {
      userID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.toggleActive(args);
    },
  },

  toggleBlkActive: {
    type: GraphQLBoolean,
    args: {
      userID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.toggleBlkActive(args);
    },
  },

  resolveFlag: {
    type: GraphQLBoolean,
    args: {
      flagID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      isValid: {
        type: new GraphQLNonNull(GraphQLBoolean),
      },
    },
    resolve(parentValue, args) {
      return AdminResolver.resolveFlag(args);
    },
  },
};
