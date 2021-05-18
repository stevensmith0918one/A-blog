const {
  GraphQLList,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLObjectType,
} = require("graphql");
const { Types } = require("mongoose");

const auth = require("../../config/auth");

const ChatType = require("../types/Chat");
const MessageType = require("../types/Message");
const { friendItemType, chatRoomType } = require("../types/Generic");
const ChatResolver = require("../resolvers/Chat");

const { ObjectId } = Types;

module.exports = {
  chat: {
    type: ChatType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    async resolve(_, { id, isMobile }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }

        return ChatResolver.getByID({ id, req }).then((data) => {
          if (data) {
            /* eslint no-param-reassign: 0 */
            data.width = 32;
            data.height = 32;
            data.isMobile = isMobile === "true";
          }
          return data;
        });
      }
      return {};
    },
  },

  getMessages: {
    type: ChatType,
    args: {
      chatID: {
        type: GraphQLNonNull(GraphQLID),
      },
      cursor: {
        type: GraphQLString,
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt),
      },
      isMobile: {
        type: GraphQLString,
      },
      maxW: {
        type: GraphQLInt,
      },
      maxH: {
        type: GraphQLInt,
      },
    },
    async resolve(_, { chatID, cursor, limit, isMobile, maxW, maxH }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return ChatResolver.getMessages({
          chatID: chatID.toString(),
          cursor,
          limit,
          req,
        }).then((data) => {
          if (data) {
            data.width = 50;
            data.height = 50;
            data.isMobile = isMobile === "true";
            data.maxW = maxW;
            data.maxH = maxH;
          }
          return data;
        });
      }
      return {};
    },
  },

  getInbox: {
    type: new GraphQLList(MessageType),
    args: {
      skip: {
        type: GraphQLNonNull(GraphQLInt),
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt),
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    async resolve(_, { skip, limit, isMobile }, req) {
      if (await auth.isAuthenticated(req)) {
        return ChatResolver.getInbox({ skip, limit, req }).then((data) => {
          const isMobileBool = isMobile === "true";
          data = data.map((msg) => {
            return { ...msg, isMobile: isMobileBool };
          });

          return data;
        });
      }
      return {};
    },
  },

  getChatPage: {
    type: new GraphQLObjectType({
      name: "ChatPageType",
      fields: {
        chatrooms: {
          type: new GraphQLList(chatRoomType),
        },
        ftMeetCount: {
          type: GraphQLInt,
        },
      },
    }),
    args: {
      skip: {
        type: GraphQLNonNull(GraphQLInt),
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt),
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    async resolve(_, { skip, limit, isMobile }, req) {
      if (await auth.isAuthenticated(req)) {
        return ChatResolver.getChatPage({ skip, limit, req }).then((data) => {
          if (data) {
            data.width = 32;
            data.height = 32;
            data.isMobile = isMobile === "true";
          }

          return data;
        });
      }
      return {};
    },
  },

  getFriends: {
    type: new GraphQLList(friendItemType),
    args: {
      skip: {
        type: GraphQLInt,
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt),
      },
      chatID: {
        type: GraphQLID,
      },
      isEvent: {
        type: GraphQLBoolean,
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    async resolve(_, { skip, limit, chatID, isEvent, isMobile }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return ChatResolver.getFriends({
          skip,
          limit,
          req,
          chatID,
          isEvent,
        }).then((data) => {
          if (data) {
            data.width = 32;
            data.height = 32;
            data.isMobile = isMobile === "true";
          }
          return data;
        });
      }
      return {};
    },
  },
};
