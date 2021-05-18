import { v4 as uuidv4 } from "uuid";
import pubsub from "../../config/pubsub";

const _ = require("lodash");
const Chat = require("../../models/Chat");
const Filter = require("../../models/Filter");
const { clearHash, client } = require("../../utils/cache");

const VIDEO_QUEUE_KEY = "VIDEO_QUEUE_KEY";
const INCOMING_VIDEO_CHAT = "INCOMING_VIDEO_CHAT";
const MESSAGE_ADDED = "MESSAGE_ADDED";
const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";

// TODO: Add error checking sing Sentry
async function startVideoChat(chatID, req) {
  try {
    const chat = await Chat.findById(chatID).cache({
      key: chatID,
    });

    // Does Chat exist
    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    // Is the user trying to contact the other before they responded
    if (
      chat.participants.length === 1 &&
      chat.participants[0].toString() === req.user.profileID
    ) {
      throw new Error("Client: Please wait for the member(s) to respond.");
    }

    // Does user have access to chat or are they just invited
    if (
      !_.includes(
        chat.participants.map((item) => item.toString()),
        req.user.profileID.toString()
      ) &&
      !_.includes(
        chat.invited.map((item) => item.toString()),
        req.user.profileID.toString()
      )
    ) {
      throw new Error("Client: Chat is no longer available.");
    } else if (
      !_.includes(
        chat.participants.map((item) => item.toString()),
        req.user.profileID.toString()
      )
    ) {
      // TODO: translate
      throw new Error(
        "Client: Only participants can start Video Chat. (send a message first)"
      );
    }

    // Make cacheID
    const videoChatKey = `${chatID}vc`;

    // Get Video Chat
    let videoChat = await client.get(videoChatKey);
    if (!videoChat) {
      // Info needed for tracking whos in chat and time it was created
      videoChat = { participants: [req.user._id], startTime: Date.now() };
    } else {
      videoChat = JSON.parse(videoChat);
    }

    // Creates Password
    const password = chatID + videoChat.startTime;
    if (videoChat.participants.indexOf(req.user._id.toString()) < 0) {
      videoChat.participants.push(req.user._id);
    } else {
      return { rn: videoChatKey, p: password };
    }

    await client.set(videoChatKey, JSON.stringify(videoChat), "EX", 21600); // 6 hours cache

    // Add msg to chat
    const joinMsg = {
      text: req.user.username,
      type: "joinvid",
      participants: chat.participants,
      invited: chat.invited,
      chatID,
      fromUser: req.user,
      createdAt: new Date(),
    };

    // Set curretn videoqueue count here
    await Chat.findOneAndUpdate(
      {
        _id: chatID,
      },
      {
        $set: {
          videoActive: true,
        },
        $push: { messages: joinMsg },
      }
    );

    alertUserInbox(joinMsg);
    // Returns chat Info
    clearHash(chatID);
    return { rn: videoChatKey, p: password };
  } catch (err) {
    throw new Error(err);
  }
}

async function leaveVideoChat(chatID, user) {
  const chat = await Chat.findById(chatID).cache({
    key: chatID,
  });

  // Does Chat exist
  if (!chat) {
    throw new Error("Client: Chat not found.");
  }

  // Make cacheID
  const videoChatKey = `${chatID}vc`;

  // Check it chat already has participants
  let videoChat = await client.get(videoChatKey);

  // if not make new
  if (videoChat) {
    videoChat = JSON.parse(videoChat);
    if (videoChat.participants.indexOf(user._id.toString()) > -1) {
      videoChat.participants = videoChat.participants.filter(
        (x) => x.toString() !== user._id.toString()
      );
    }
  }
  // Add msg to chat
  const leaveMsg = {
    text: user.username,
    type: "leavevid",
    participants: chat.participants,
    invited: chat.invited,
    chatID,
    fromUser: user,
    createdAt: new Date(),
  };

  await Chat.findOneAndUpdate(
    {
      _id: chatID,
    },
    {
      $set: {
        videoActive: videoChat.participants.length !== 0,
      },
      $push: { messages: leaveMsg },
    }
  );

  alertUserInbox(leaveMsg);

  clearHash(chatID);

  await client.set(videoChatKey, JSON.stringify(videoChat), "EX", 21600); // 6 hours cache

  return true;
}

async function enterVideoQueue(user) {
  try {
    const { _id, sex, location, filterID } = user;
    const userID = _id.toString();
    const doNotDisplayList = [userID];

    const videoQueue = await client.get(VIDEO_QUEUE_KEY);
    let newVideoQueue = [];

    if (videoQueue) {
      newVideoQueue = JSON.parse(videoQueue);
      // Find if I'm already in the queue *shouldn't happen
      if (
        _.includes(
          newVideoQueue.map((item) => item.userID),
          userID
        )
      ) {
        // TODO: Test if we need this after exit works perfectly
        return getNextVideo(userID);
      }
    }

    const filter = await Filter.findById(filterID).cache({ key: filterID });
    if (filter) {
      if (!_.isEmpty(filter.blocked)) {
        doNotDisplayList.unshift(
          ...filter.blocked.map((item) => item.toString())
        );
      }
    }

    newVideoQueue.push({
      userID,
      sex,
      location,
      passed: doNotDisplayList,
      joinedAt: Date.now(),
      chatPartner: null,
    });

    await client.set(
      VIDEO_QUEUE_KEY,
      JSON.stringify(newVideoQueue),
      "EX",
      21600
    ); // 6 hours cache

    // initiate search
    getNextVideo(userID);

    return true;
  } catch (err) {
    throw new Error(err);
  }
}

// ALERT CURRENT PARTER LEAVING with sub
// Find them a new match and send sub
async function getNextVideo(userID) {
  try {
    const videoQueue = await client.get(VIDEO_QUEUE_KEY);

    if (!videoQueue) {
      throw Error("Client: An error has occured please try again.");
    }

    let newVideoQueue = JSON.parse(videoQueue);

    if (newVideoQueue.length === 0) {
      return true;
    }

    const myUserInfo = _.find(newVideoQueue, (item) => item.userID === userID);

    if (!myUserInfo) {
      throw Error("Client: An error has occured please try again.");
    }

    if (myUserInfo.chatPartner) {
      newVideoQueue = await returnToQueue({
        userID,
        partnerID: myUserInfo.chatPartner,
        videoQueue: newVideoQueue,
      });
    }

    const availableUsers = newVideoQueue.filter(
      (item) =>
        // user isnt in my passed
        myUserInfo.passed.indexOf(item.userID) < 0 &&
        // not me
        myUserInfo.userID !== item.userID &&
        // im not in their passed
        item.passed.indexOf(userID) < 0 &&
        // they arent in a chat
        item.chatPartner === null
    );

    if (availableUsers.length === 0) return true;

    const chosenUser = _.first(availableUsers);

    if (!chosenUser) return true;
    createChatroom({
      userID,
      partnerID: chosenUser.userID,
      videoQueue: newVideoQueue,
    });

    return true;
  } catch (err) {
    throw new Error("Client: An error has occured please try again.");
  }
}

async function exitVideoQueue(userID) {
  let videoQueue = await client.get(VIDEO_QUEUE_KEY);
  if (!videoQueue) {
    return true;
  }
  videoQueue = JSON.parse(videoQueue);

  const myUserInfo = _.find(videoQueue, (item) => item.userID === userID);

  if (!myUserInfo) {
    return true;
  }

  videoQueue = videoQueue.filter((item) => item.userID !== userID);
  await client.set(VIDEO_QUEUE_KEY, JSON.stringify(videoQueue), "EX", 21600); // 6 hours cache
  if (myUserInfo.chatPartner) {
    await returnToQueue({
      userID,
      partnerID: myUserInfo.chatPartner,
      videoQueue,
    });
  }

  return true;
}

async function alertUserInbox(message) {
  await pubsub.publish(MESSAGE_ADDED, {
    message,
  });
  await pubsub.publish(INBOX_MESSAGE_ADDED, {
    message,
  });
}

async function createChatroom({ userID, partnerID, videoQueue }) {
  const newVideoQueue = videoQueue;

  const myIdx = newVideoQueue.findIndex((item) => item.userID === userID);
  if (myIdx > -1) {
    newVideoQueue[myIdx].passed.push(partnerID);
    newVideoQueue[myIdx].chatPartner = partnerID;
    newVideoQueue[myIdx].joinedAt = Date.now();
  }

  const theirIdx = newVideoQueue.findIndex((item) => item.userID === partnerID);
  if (theirIdx > -1) {
    newVideoQueue[theirIdx].passed.push(userID);
    newVideoQueue[theirIdx].chatPartner = userID;
    newVideoQueue[theirIdx].joinedAt = Date.now();
  }

  await client.set(VIDEO_QUEUE_KEY, JSON.stringify(newVideoQueue), "EX", 21600); // 6 hours cache

  // Alert them of our chat room
  pubsub.publish(INCOMING_VIDEO_CHAT, {
    userIDs: [userID, partnerID],
    rn: uuidv4(),
    p: uuidv4(),
  });
}

async function returnToQueue({ userID, partnerID, videoQueue }) {
  const newVideoQueue = videoQueue;

  // remove them from my current chat and add them to passed
  const myIdx = newVideoQueue.findIndex((item) => item.userID === userID);
  if (myIdx > -1) {
    newVideoQueue[myIdx].passed.push(partnerID);
    newVideoQueue[myIdx].chatPartner = null;
  }

  // remove me from their current chat and add me to passed
  const theirIdx = newVideoQueue.findIndex((item) => item.userID === partnerID);
  if (theirIdx > -1) {
    newVideoQueue[theirIdx].passed.push(userID);
    newVideoQueue[theirIdx].chatPartner = null;
  }

  await client.set(VIDEO_QUEUE_KEY, JSON.stringify(newVideoQueue), "EX", 21600); // 6 hours cache
  // Alert them they are disconected ** BE SURE TO USE NEXT UNTIL DOUBLE SUB ISSUE FIXED
  await pubsub.publish(INCOMING_VIDEO_CHAT, {
    userIDs: [partnerID, userID],
    rn: "next",
  });

  return newVideoQueue;
}

module.exports = {
  startVideoChat,
  leaveVideoChat,
  enterVideoQueue,
  getNextVideo,
  exitVideoQueue,
};
