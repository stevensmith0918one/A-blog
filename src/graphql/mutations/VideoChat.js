const { GraphQLID } = require("graphql");

const auth = require("../../config/auth");

const { chatInfoType } = require("../types/Generic");
const VideoChatResolver = require("../resolvers/VideoChat");

module.exports = {
  startVideoChat: {
    type: chatInfoType,
    args: {
      chatID: {
        type: GraphQLID,
      },
    },
    async resolve(_, { chatID }, req) {
      if (auth.isAuthenticated(req)) {
        // TODO: Find how to prevent race condition here
        return VideoChatResolver.startVideoChat(chatID, req);
      }
      return {};
    },
  },
};
