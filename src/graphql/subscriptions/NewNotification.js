// @flow
import pubsub from "../../config/pubsub";

const mongoose = require("mongoose");
const GraphQL = require("graphql");
const { notificationType } = require("../types/Generic");

const { GraphQLString } = GraphQL;

const NOTICE_ADDED = "NOTICE_ADDED";

module.exports = {
  type: notificationType,
  args: {
    isMobile: {
      type: GraphQLString,
    },
  },
  subscribe: () => pubsub.asyncIterator(NOTICE_ADDED),
  async resolve(payload, { isMobile }, req) {
    if (!payload) return undefined;
    if (
      payload.notification.toMemberIDs &&
      payload.notification.toMemberIDs.indexOf(req.user.profileID.toString()) <
        0
    )
      return undefined;
    if (
      payload.notification.toUserIDs &&
      payload.notification.toUserIDs.indexOf(req.user.id.toString()) < 0
    )
      return undefined;

    // eslint-disable-next-line no-param-reassign
    payload.notification._id = mongoose.Types.ObjectId().toString();
    // eslint-disable-next-line no-param-reassign
    payload.notification.isMobile = isMobile === "true";

    return payload.notification;
  },
};
