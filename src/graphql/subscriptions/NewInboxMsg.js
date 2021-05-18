// @flow

import * as Sentry from "@sentry/node";
import pubsub from "../../config/pubsub";

const _ = require("lodash");
const GraphQL = require("graphql");
const MessageType = require("../types/Message");
const auth = require("../../config/auth");

const { GraphQLString } = GraphQL;

const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";

module.exports = {
  type: MessageType,
  args: {
    isMobile: {
      type: GraphQLString,
    },
  },
  subscribe: () => pubsub.asyncIterator(INBOX_MESSAGE_ADDED),
  async resolve(payload, { isMobile }, req) {
    if (auth.isAuthenticated(req)) {
      if (!payload) {
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
          // eslint-disable-next-line no-param-reassign
          payload.message.isMobile = isMobile === "true";
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
