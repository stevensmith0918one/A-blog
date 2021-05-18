// @flow

import * as Sentry from "@sentry/node";
import pubsub from "../../config/pubsub";

const lodash = require("lodash");
const { msgActionType } = require("../types/Generic");
const { readChat } = require("../resolvers/Chat");
const auth = require("../../config/auth");

const MESSAGE_ACTION = "MESSAGE_ACTION";
const { client } = require("../../utils/cache");

module.exports = {
  type: msgActionType,
  subscribe: () => pubsub.asyncIterator(MESSAGE_ACTION),
  async resolve(payload, _, req) {
    if (auth.isAuthenticated(req)) {
      // Without this it does not work
      if (!payload) return undefined;
      const activeChatkey = `${req.user._id.toString()}activechat`;
      const activeChatID = await client.get(activeChatkey); // 30 minutes cache
      try {
        if (
          lodash.includes(
            payload.participants,
            req.user.profileID.toString()
          ) &&
          payload.action.userID !== req.user._id.toString()
        ) {
          const isActive = activeChatID === payload.action.chatID;
          if (isActive) {
            readChat({ chatID: payload.action.chatID, userID: req.user._id });
          }
          return {
            ...payload.action,
            isActive,
          };
        }
      } catch (e) {
        Sentry.captureException(e);
        throw new Error(e);
      }
    }
    return undefined;
  },
};
