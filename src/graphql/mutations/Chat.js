import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLBoolean,
} from "graphql";

const auth = require("../../config/auth");

const ChatResolver = require("../resolvers/Chat");

module.exports = {
  sendMessage: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: GraphQLID,
      },
      text: {
        type: new GraphQLNonNull(GraphQLString),
      },
      invitedProfile: {
        type: GraphQLID,
      },
      instant: {
        type: GraphQLBoolean,
      },
    },
    async resolve(_, { chatID, text, invitedProfile, instant }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature."
          );
        }
        await ChatResolver.sendMessage({
          chatID,
          text,
          invitedProfile,
          instant,
          req,
        });

        return true;
      }
      return null;
    },
  },

  removeSelf: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      isBlock: {
        type: GraphQLBoolean,
      },
    },
    async resolve(_, { chatID, isBlock }, req) {
      if (auth.isAuthenticated(req)) {
        await ChatResolver.removeSelf({
          chatID,
          isBlock,
          req,
        });

        return true;
      }
      return null;
    },
  },

  inviteProfile: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      invitedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
    },
    async resolve(_, { chatID, invitedProfiles }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature."
          );
        }

        await ChatResolver.inviteProfile({
          chatID,
          invitedProfiles,
          req,
        });

        return true;
      }
      return null;
    },
  },

  removeProfiles: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      removedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
    },
    resolve(_, { chatID, removedProfiles }, req) {
      return ChatResolver.removeProfiles({
        chatID,
        removedProfiles,
        req,
      });
    },
  },
  setTyping: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      isTyping: {
        type: new GraphQLNonNull(GraphQLBoolean),
      },
    },
    async resolve(_, { chatID, isTyping }, req) {
      if (auth.isAuthenticated(req)) {
        await ChatResolver.setTyping({
          chatID,
          isTyping,
          req,
        });
        return true;
      }
      return null;
    },
  },
};
