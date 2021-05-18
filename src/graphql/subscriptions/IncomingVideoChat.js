// @flow

import * as Sentry from "@sentry/node";
import pubsub from "../../config/pubsub";

const { chatInfoType } = require("../types/Generic");
const auth = require("../../config/auth");

const INCOMING_VIDEO_CHAT = "INCOMING_VIDEO_CHAT";

module.exports = {
  type: chatInfoType,
  subscribe: () => pubsub.asyncIterator(INCOMING_VIDEO_CHAT),
  async resolve(payload, _, req) {
    if (auth.isAuthenticated(req)) {
      if (!payload) {
        return undefined;
      }
      const { userIDs, rn, p } = payload;
      try {
        if (userIDs.includes(req.user._id.toString())) {
          return { rn, p };
        }
      } catch (e) {
        Sentry.captureException(e);
        throw new Error(e);
      }
    }
    return undefined;
  },
};
