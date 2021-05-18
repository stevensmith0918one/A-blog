/* eslint-disable consistent-return */
/* eslint-disable new-cap */
/* eslint-disable prefer-rest-params */
const Sentry = require("@sentry/node");
const AsyncLock = require("async-lock");

const lock = new AsyncLock({ timeout: 10000 });
const auth = require("../config/auth");
const User = require("../models/User");
const VideoChatResolver = require("../graphql/resolvers/VideoChat");

async function handleFTMQueue(token, action) {
  try {
    const user = await User.findByToken(token);
    if (!user) return;
    if (auth.isAuthenticated({ user })) {
      lock.acquire("key", () => {
        if (action === "enter") {
          VideoChatResolver.enterVideoQueue(user);
        } else if (action === "next") {
          VideoChatResolver.getNextVideo(user._id.toString());
        } else {
          VideoChatResolver.exitVideoQueue(user._id.toString());
        }
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function handleLeaveVChat(token, chatID) {
  try {
    const user = await User.findByToken(token);
    if (!user) return;
    if (auth.isAuthenticated({ user })) {
      VideoChatResolver.leaveVideoChat(chatID, user);
    }
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  handleFTMQueue,
  handleLeaveVChat,
};
