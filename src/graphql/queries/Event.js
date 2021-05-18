const {
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLID,
} = require("graphql");
const { Types } = require("mongoose");

const auth = require("../../config/auth");

const { EventType } = require("../types/Event");
const ChatType = require("../types/Chat");
const EventResolver = require("../resolvers/Event");

const { ObjectId } = Types;

module.exports = {
  event: {
    type: EventType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
      },
      isMobile: {
        type: GraphQLString,
      },
    },
    resolve(_, { id, isMobile }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return EventResolver.getByID({ id, req }).then((data) => {
          if (data) {
            /* eslint no-param-reassign: 0 */
            data.ownerProWidth = 57;
            data.ownerProHeight = 57;
            data.width = 255;
            data.height = 340;
            data.isMobile = isMobile === "true";
          }
          return data;
        });
      }
      return {};
    },
  },

  getMyEvents: {
    type: new GraphQLList(EventType),
    resolve(parentValue, _, req) {
      if (auth.isAuthenticated(req)) {
        return EventResolver.getMyEvents(req);
      }
      return {};
    },
  },

  getComments: {
    type: ChatType,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      cursor: {
        type: GraphQLString,
      },
      limit: {
        type: new GraphQLNonNull(GraphQLInt),
      },
    },
    resolve(_, { chatID, cursor, limit }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectId.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return EventResolver.getComments({
          chatID: chatID.toString(),
          cursor,
          limit,
          req,
        });
      }
      return {};
    },
  },

  searchEvents: {
    type: new GraphQLList(EventType),
    args: {
      long: { type: new GraphQLNonNull(GraphQLFloat) },
      lat: { type: new GraphQLNonNull(GraphQLFloat) },
      maxDistance: { type: new GraphQLNonNull(GraphQLInt) },
      kinks: { type: new GraphQLList(GraphQLString) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      skip: { type: new GraphQLNonNull(GraphQLInt) },
    },
    resolve(_, { long, lat, maxDistance = 50, kinks, limit, skip }, req) {
      if (auth.isAuthenticated(req)) {
        return EventResolver.searchEvents({
          long,
          lat,
          maxDistance,
          kinks,
          req,
          limit,
          skip,
        }).then((data) => {
          data.forEach((el) => {
            el.ownerProWidth = 33;
            el.ownerProHeight = 33;
            el.width = 220;
            el.height = 200;
          });
          return data;
        });
      }
      return {};
    },
  },
};
