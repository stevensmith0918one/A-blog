// @flow
import * as Sentry from "@sentry/node";
import pubsub from "../../config/pubsub";

const _ = require("lodash");
const graphql = require("graphql");
const MessageType = require("../types/Message");
const { clearHash } = require("../../utils/cache");
const auth = require("../../config/auth");

const { GraphQLID, GraphQLNonNull, GraphQLString, GraphQLInt } = graphql;

const MESSAGE_ADDED = "MESSAGE_ADDED";

module.exports = {
  type: MessageType,
  args: {
    chatID: {
      type: new GraphQLNonNull(GraphQLID),
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
  subscribe: () => pubsub.asyncIterator(MESSAGE_ADDED),
  async resolve(payload, { chatID, isMobile, maxW, maxH }, req) {
    if (auth.isAuthenticated(req)) {
      // Without this it does not work
      if (!payload || chatID !== payload.message.chatID) {
        return undefined;
      }
      try {
        if (
          _.includes(
            payload.message.participants,
            req.user.profileID.toString()
          ) ||
          _.includes(payload.message.invited, req.user.profileID.toString())
        ) {
          clearHash(chatID);
          // eslint-disable-next-line no-param-reassign
          payload.message.isMobile = isMobile === "true";
          // eslint-disable-next-line no-param-reassign
          payload.maxW = maxW;
          // eslint-disable-next-line no-param-reassign
          payload.maxH = maxH;
          return payload.message;
        }
        return undefined;
      } catch (e) {
        Sentry.captureException(e);
        throw new Error(e);
      }
    }
    return undefined;
  },
};
