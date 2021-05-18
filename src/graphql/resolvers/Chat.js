import moment from "moment";
import * as Sentry from "@sentry/node";
import pubsub from "../../config/pubsub";

const _ = require("lodash");
const validator = require("validator");
const Chat = require("../../models/Chat");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const { clearHash, client } = require("../../utils/cache");
const ProfileResolver = require("./Profile");
const { getFTMeetCount } = require("./System");
const Event = require("../../models/Event");
const { sendEmailToProfile } = require("../../utils/email");

const MESSAGE_ADDED = "MESSAGE_ADDED";
const NOTICE_ADDED = "NOTICE_ADDED";
const INBOX_MESSAGE_ADDED = "INBOX_MESSAGE_ADDED";
const MESSAGE_ACTION = "MESSAGE_ACTION";

function isImg(string) {
  const textArr = string.split(".");
  if (textArr.length === 2) {
    if (textArr[1].match(/^(jpg|jpeg|png)$/)) return true;
  }
  return false;
}

async function sendMessage({ chatID, text, invitedProfile, instant, req }) {
  try {
    if (!req.user.isEmailOK) {
      throw new Error(
        "Client: Please confirm your email before contacting members."
      );
    }

    const date = new Date();

    if (instant && req.user.activity.msgsSent.count > 4) {
      if (moment(req.user.activity.msgsSent.date).isSame(date, "day")) {
        throw new Error("Client: Max Daily Messages Reached!");
      } else {
        req.user.activity.msgsSent.count = 0;
        req.user.activity.msgsSent.date = date;
      }
    }
    text.split(" ").forEach(async (word) => {
      if (
        moment(req.user.activity.linksSent.today).isSame(date, "day") &&
        validator.isURL(word) &&
        req.user.activity.linksSent.count > 5 &&
        !moment(req.user.activity.linksSent.ignoreDate).isSame(date, "day")
      ) {
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            captchaReq: true,
          },
        });

        throw new Error(
          "Client: Sent too many links, please complete Captcha to continue."
        );
      } else if (validator.isURL(word)) {
        if (moment(req.user.activity.linksSent.today).isBefore(date, "day")) {
          await User.findByIdAndUpdate(req.user._id, {
            $set: {
              "activity.linksSent.today": date,
            },
            $inc: { "activity.linksSent.count": 1 },
          });
        } else {
          await User.findByIdAndUpdate(req.user._id, {
            $inc: { "activity.linksSent.count": 1 },
          });
        }
      }
    });

    // set currently viewed chat in cache
    const activeChatkey = `${req.user._id.toString()}activechat`;

    if (chatID !== undefined) {
      const chat = await Chat.findById(chatID).cache({
        key: chatID,
      });

      // Does Chat exist
      if (!chat) {
        throw new Error("Client: Chat not found.");
      }

      client.set(activeChatkey, chatID, "EX", 1800); // 30 minutes cache
      await clearHash(chatID);

      if (!chat.isChatroom) {
        // Is the user trying to contact the other before they responded
        if (
          chat.participants.length === 1 &&
          chat.participants[0].toString() === req.user.profileID
        ) {
          throw new Error("Client: Please wait for the member to respond.");
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
          chat.participants.unshift(req.user.profileID);
          chat.invited.remove(req.user.profileID);
        }
      } else if (
        !_.includes(
          chat.participants.map((item) => item.toString()),
          req.user.profileID.toString()
        )
      ) {
        chat.participants.unshift(req.user.profileID);
      }

      chat.messages.push({
        fromUser: req.user._id,
        text,
        type: isImg(text) ? "img" : "msg",
        createdAt: date,
      });

      const lastSeenIndex = chat.lastSeen.findIndex(
        (el) => el.userID.toString() === req.user._id.toString()
      );

      if (lastSeenIndex < 0) {
        chat.lastSeen.push({
          userID: req.user._id,
          date,
        });
      } else {
        chat.lastSeen[lastSeenIndex].date = date;
      }

      await Chat.findByIdAndUpdate(chatID, {
        $set: {
          messages: chat.messages,
          lastSeen: chat.lastSeen,
          participants: chat.participants,
          invited: chat.invited,
        },
      });

      await clearHash(chatID);

      if (process.env.NODE_ENV !== "development") {
        await emailParticipants({
          chat,
          fromUsername: req.user.username,
          fromUserID: req.user._id,
        });
      }
      const lastmessage = _.last(chat.messages);
      const lastMessageChat = {
        id: lastmessage.id,
        text: lastmessage.text,
        fromUser: lastmessage.fromUser,
        type: isImg(lastmessage.text) ? "img" : "msg",
        createdAt: lastmessage.createdAt,
        chatID: chat._id,
        participants: chat.participants,
        invited: chat.invited,
        seenBy: 0,
      };

      await pubsub.publish(MESSAGE_ADDED, {
        message: lastMessageChat,
      });

      if (!chat.isChatroom) {
        await pubsub.publish(INBOX_MESSAGE_ADDED, {
          message: lastMessageChat,
        });
      }

      return;
    }

    if (_.includes(invitedProfile, req.user.profileID)) {
      throw new Error("Client: Cannot invite yourself!");
    }

    // Has this person already started a chat
    const oldchat = await Chat.findOne({
      $or: [
        {
          participants: req.user.profileID,
          invited: invitedProfile,
        },
        { participants: { $all: [req.user.profileID, invitedProfile] } },
      ],
    });

    if (oldchat) {
      throw new Error("Client: You've already contacted this member.");
    }

    // Get fields
    const chatFields = {};

    // Check Validation
    // check if chat already exists by
    const toProfile = await Profile.findOne({
      _id: invitedProfile,
      active: true,
    }).cache({ key: invitedProfile });

    if (!toProfile) {
      throw new Error("Client: User not found.");
    }

    ProfileResolver.likeProfile({
      toProfileID: invitedProfile,
      req,
      isDirect: true,
    });

    if (req.user.blackMember.active && instant) {
      chatFields.participants = [req.user.profileID, invitedProfile];
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          "activity.msgsSent.date": date,
        },
        $inc: { "activity.msgsSent.count": 1 },
      });
    } else {
      chatFields.participants = [req.user.profileID];
      chatFields.invited = [invitedProfile];
    }

    // Messages aren't pushing in for initial send.
    chatFields.messages = [
      {
        fromUser: req.user._id,
        text,
        type: isImg(text) ? "img" : "msg",
        createdAt: date,
      },
    ];
    chatFields.ownerProfileID = req.user.profileID;
    chatFields.lastSeen = [{ userID: req.user._id, date }];

    const chat = await new Chat(chatFields).save();
    client.set(activeChatkey, chat._id.toString(), "EX", 1800); // 30 minutes cache

    await emailParticipants({
      chat,
      fromUsername: req.user.username,
      fromUserID: req.user._id,
      toProfile,
    });
    const lastmessage = _.last(chat.messages);
    const lastMessageChat = {
      id: lastmessage.id,
      text: lastmessage.text,
      fromUser: lastmessage.fromUser,
      type: isImg(lastmessage.text) ? "img" : "msg",
      createdAt: lastmessage.createdAt,
      chatID: chat._id,
      participants: chat.participants,
      invited: chat.invited,
      seenBy: 0,
    };
    await pubsub.publish(MESSAGE_ADDED, {
      message: lastMessageChat,
    });
    await pubsub.publish(INBOX_MESSAGE_ADDED, {
      message: lastMessageChat,
    });
    return;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function emailParticipants({
  chat,
  fromUsername,
  fromUserID,
  toProfile,
}) {
  try {
    if (chat.participants.length !== 1) {
      chat.participants.forEach(async (id) => {
        const profile = await Profile.findOne({
          _id: id,
          active: true,
        }).cache({ key: id });
        if (profile) {
          await sendEmailToProfile({ profile, fromUsername, fromUserID });
        }
      });
    } else if (toProfile) {
      await sendEmailToProfile({
        profile: toProfile,
        fromUsername,
        fromUserID,
      });
    }
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function getByID({ id, req }) {
  try {
    const chat = await Chat.findOne({
      _id: id,
    }).cache({ key: id });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (!chat.isChatroom) {
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
      }
    }

    return chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getMessages({ chatID, cursor, limit, req }) {
  try {
    const date = new Date();
    const chat = await Chat.findOne({
      _id: chatID,
    });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (!chat.isChatroom) {
      if (chat.participants === undefined) {
        throw new Error("Client: Chat room closed.");
      }

      if (
        chat.participants.indexOf(req.user.profileID) < 0 &&
        chat.invited.indexOf(req.user.profileID) < 0
      ) {
        throw new Error("Client: Chat is no longer available.");
      }
    }

    const lastSeenIndex = chat.lastSeen.findIndex(
      (el) => el.userID.toString() === req.user._id.toString()
    );

    if (lastSeenIndex < 0) {
      chat.lastSeen.push({
        userID: req.user._id,
        date,
      });
    } else {
      chat.lastSeen[lastSeenIndex].date = date;
    }

    await Chat.findByIdAndUpdate(chatID, {
      $set: {
        lastSeen: chat.lastSeen,
      },
    });

    await clearHash(chatID);

    if (chat.messages.length === 0) {
      return chat;
    }

    // set currently viewed chat in cache
    const activeChatkey = `${req.user._id.toString()}activechat`;
    client.set(activeChatkey, chatID, "EX", 1800); // 30 minutes cache

    // mark read
    readChat({ chat, userID: req.user._id });

    // add Seenby count
    let seenBy = 0;
    chat.lastSeen.forEach((last) => {
      if (
        moment(chat.messages[chat.messages.length - 1].createdAt).isBefore(
          last.date
        ) &&
        last.userID.toString() !== req.user._id.toString()
      ) {
        seenBy += 1;
      }
    });

    chat.messages[chat.messages.length - 1].seenBy = seenBy;

    if (limit) {
      const messages =
        cursor !== null
          ? await _.take(
              _.filter(
                _.orderBy(chat.messages, ["createdAt"], ["desc"]),
                ({ createdAt }) =>
                  new Date(createdAt).getTime() < new Date(cursor).getTime()
              ),
              limit
            )
          : await _.take(
              _.orderBy(chat.messages, ["createdAt"], ["desc"]),
              limit
            );

      chat.messages = messages === null ? [] : messages;
    }

    return chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function readChat({ chat, chatID, userID }) {
  try {
    const date = Date.now();
    const currchat = chat || (await Chat.findById(chatID));
    if (!currchat) {
      throw new Error("Client: Chat not found.");
    }

    const lastSeenIndex = currchat.lastSeen.findIndex(
      (el) => el.userID.toString() === userID.toString()
    );

    if (lastSeenIndex < 0) {
      currchat.lastSeen.push({ userID, date });
    } else {
      currchat.lastSeen[lastSeenIndex].date = date;
    }

    await Chat.findByIdAndUpdate(currchat._id, {
      $set: {
        lastSeen: currchat.lastSeen,
      },
    });

    return currchat._id;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function removeSelf({ chatID, isBlock, req }) {
  const chat = await Chat.findById(chatID).cache({
    key: chatID,
  });

  // Does Chat exist
  if (!chat) {
    throw new Error("Client: Chat not found.");
  }

  // Block others after leave
  if (isBlock) {
    const otherMems = chat.participants.filter(
      (part) => part !== req.user.profileID.toString()
    );
    otherMems.forEach((mem) =>
      ProfileResolver.blockProfile({ blockedProfileID: mem, req })
    );
  }

  const removeMsg = {
    text: req.user.username,
    type: "left",
    participants: chat.participants,
    invited: chat.invited,
    chatID,
    createdAt: new Date(),
  };

  chat.messages.push(removeMsg);
  chat.participants = chat.participants.filter(
    (el) => el.toString() !== req.user.profileID.toString()
  );

  chat.invited = chat.invited.filter(
    (el) => el.toString() !== req.user.profileID.toString()
  );

  if (chat.participants.length < 2) {
    if (chat.flagIDs.length > 0) {
      chat.active = false;
    } else {
      await Chat.remove({
        _id: chatID,
      });
    }
  }

  await pubsub.publish(MESSAGE_ADDED, {
    message: removeMsg,
  });

  clearHash(chatID);
}

async function inviteProfile({ chatID, invitedProfiles, req }) {
  try {
    // Check Validation
    const chat = await Chat.findOne({
      _id: chatID,
    });
    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.participants.indexOf(req.user.profileID) < 0) {
      throw new Error(
        "Client: Only Participants can invite others. (send a message first)"
      );
    }

    // eslint-disable-next-line no-param-reassign
    invitedProfiles = await invitedProfiles.reduce(function f(result, profile) {
      if (
        chat.invited.indexOf(profile) < 0 &&
        chat.participants.indexOf(profile) < 0
      ) {
        result.push(profile);
      }
      return result;
    }, []);

    await Chat.findByIdAndUpdate(chatID, {
      $push: { invited: invitedProfiles },
    });

    if (invitedProfiles.length === 0) {
      // User has already been invited or are participants
      return;
    }

    // Need fake id for item key in frontend
    const notification = {
      targetID: chatID,
      toMemberIDs: invitedProfiles,
      type: "chat",
      text: "has invited you to chat",
      fromUserID: req.user._id,
      fromUsername: req.user.username,
      date: new Date(),
    };

    Profile.addNotification(notification);

    await invitedProfiles.forEach(async (id) => {
      const profile = await Profile.findOne({ _id: id, active: true }).cache({
        key: id,
      });
      await sendEmailToProfile({
        profile,
        fromUserID: req.user._id,
        fromUsername: req.user.username,
        isChatInvite: true,
      });
    });

    await pubsub.publish(NOTICE_ADDED, {
      notification,
    });

    clearHash(chatID);
    return;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function removeProfiles({ chatID, removedProfiles, req }) {
  try {
    const chat = await Chat.findOne({
      _id: chatID,
    });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.ownerProfileID.toString() !== req.user.profileID.toString()) {
      throw new Error("Client: Only the Owner can remove members.");
    }

    if (removedProfiles.indexOf(chat.ownerProfileID.toString()) > -1) {
      throw new Error("Client: Can't remove the owner!");
    }

    if (removedProfiles.indexOf(req.user.profileID.toString()) > -1) {
      throw new Error(
        "Client: Can't remove yourself this way. Use 'Leave Conversation'."
      );
    }

    // eslint-disable-next-line no-param-reassign
    removedProfiles = await removedProfiles.reduce(async function f(
      result,
      profile
    ) {
      if (
        chat.invited.indexOf(profile) > -1 ||
        chat.participants.indexOf(profile) > -1
      ) {
        await chat.updateOne({
          $pull: {
            participants: {
              $in: profile,
            },
            invited: {
              $in: profile,
            },
          },
          $push: {
            blocked: profile,
          },
        });
        result.push(profile);
      }
      return result;
    },
    []);

    if (removedProfiles.length === 0) {
      return false;
    }

    await Profile.removeNotification({
      removeMemberIDs: removedProfiles,
      type: "chat",
      targetID: chatID,
    });

    clearHash(chatID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getInbox({ limit, skip, req }) {
  try {
    const lastMessages = [];

    let chats = await Chat.find(
      {
        $and: [
          {
            $or: [
              { participants: req.user.profileID },
              { invited: req.user.profileID },
            ],
            eventID: { $exists: false },
            isChatroom: false,
            active: true,
          },
        ],
      },
      {
        messages: 1,
        id: 1,
        participants: 1,
        invited: 1,
        lastSeen: 1,
        createdAt: 1,
      },
      { skip, limit }
    ).sort("-updatedAt");
    if (chats.length === 0) {
      return [];
    }

    chats = await chats.reduce(function f(result, chat) {
      if (
        chat.participants[0].toString() === req.user.profileID.toString() &&
        chat.participants.length === 1
      ) {
        return result;
      }
      result.push(chat);

      return result;
    }, []);

    await Promise.all(
      _.map(chats, async function f(value) {
        const lastmessage = _.last(value.messages);

        const unSeenCount = calcUnseenMsgs({
          chat: value,
          userID: req.user._id,
        });

        if (value.messages.length > 0) {
          if (lastmessage.type === "msg") {
            let otherUser = null;
            if (lastmessage.fromUser.toString() === req.user.id) {
              otherUser = _.first(
                _.filter(value.messages, (el) => {
                  if (el.fromUser) {
                    return el.fromUser.toString() !== req.user.id;
                  }
                  return false;
                })
              );
            }

            const lastMessageChat = {
              id: lastmessage._id,
              text: lastmessage.text,
              fromUser: otherUser ? otherUser.fromUser : lastmessage.fromUser,
              createdAt: lastmessage.createdAt,
              type: lastmessage.type,
              chatID: value._id,
              participants: value.participants,
              invited: value.invited,
              unSeenCount,
            };

            lastMessages.push(lastMessageChat);
          } else {
            const lastMessageChat = {
              text: lastmessage.text,
              createdAt: lastmessage.createdAt,
              type: lastmessage.type,
              chatID: value._id,
              participants: value.participants,
              invited: value.invited,
              unSeenCount,
            };
            lastMessages.push(lastMessageChat);
          }
        } else {
          const otherMember = value.participants.filter(
            (el) => el.toString() !== req.user.profileID.toString()
          );
          const lastMessageChat = {
            id: value._id,
            text: lastmessage ? lastmessage.text : "",
            fromProfile: otherMember[0],
            createdAt: value.createdAt,
            chatID: value._id,
            participants: value.participants,
            invited: value.invited,
            type: lastmessage ? lastmessage.type : "new",
            unSeenCount,
          };
          lastMessages.push(lastMessageChat);
        }
      })
    );

    return lastMessages;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getChatPage({ limit, skip, req }) {
  try {
    const ftMeetCount = await getFTMeetCount();
    if (!req.user.location.city) {
      return { ftMeetCount, chatrooms: [] };
    }
    const locArr = req.user.location.city.split(",");
    const city = locArr[0].trim();
    const state = locArr[1].trim();

    const chatrooms = await Chat.find(
      {
        $and: [
          {
            $or: [
              { participants: req.user.profileID },
              { invited: req.user.profileID },
              { name: "Global" },
              { name: state },
              { name: city },
            ],
            isChatroom: true,
            active: true,
          },
        ],
      },
      {
        id: 1,
        participants: 1,
        name: 1,
      },
      { skip, limit }
    );

    if (skip < limit) {
      if (!_.find(chatrooms, (cr) => cr.name === "Global")) {
        const chat = await new Chat({
          name: "Global",
          isChatroom: true,
        }).save();
        chatrooms.push(chat);
      }
      if (!_.find(chatrooms, (cr) => cr.name === state)) {
        const chat = await new Chat({ name: state, isChatroom: true }).save();
        chatrooms.push(chat);
      }
      if (!_.find(chatrooms, (cr) => cr.name === city)) {
        const chat = await new Chat({ name: city, isChatroom: true }).save();
        chatrooms.push(chat);
      }
    }
    // TODO: sort so Global, state,city on top then top once are ones im participants
    if (chatrooms.length === 0) {
      return { ftMeetCount, chatrooms: [] };
    }

    return { ftMeetCount, chatrooms };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function calcUnseenMsgs({ chat, userID }) {
  let unSeenCount = 0;

  let lastSeen = chat.lastSeen.find(
    (el) => el.userID.toString() === userID.toString()
  );

  // They've never seen the entire chat
  if (lastSeen === undefined) {
    unSeenCount = chat.messages.length;
  } else {
    lastSeen = lastSeen.date;
    const unSeen = chat.messages.filter((message) => {
      if (moment(message.createdAt).isAfter(lastSeen)) {
        if (
          message.fromUser &&
          message.fromUser.toString() === userID.toString()
        ) {
          return false;
        }
        return true;
      }
      return false;
    });

    unSeenCount = unSeen.length;
  }

  return unSeenCount;
}

async function getFriends({ req, skip, limit, chatID, isEvent }) {
  try {
    let friendsList = [];

    const participantList = await Chat.find(
      {
        participants: req.user.profileID,
        active: true,
        eventID: { $exists: false },
      },
      { participants: 1 }
    );

    if (participantList.length === 0) {
      return [];
    }
    let chat = [];
    if (chatID && isEvent) {
      chat = await Event.find({ _id: chatID }, { participants: 1 });

      chat = _.flatten(chat.map((el) => el.participants));
    } else if (chatID) {
      chat = await Chat.find({ _id: chatID }, { participants: 1 });

      chat = _.flatten(chat.map((el) => el.participants));
    }

    await Promise.all(
      _.map(participantList, async function f(value) {
        if (value.participants.length !== 0) {
          const participants = await Profile.find(
            {
              _id: {
                $in: value.participants,
                $ne: req.user.profileID,
                $nin: chat,
              },
              active: true,
            },
            { id: 1, profilePic: 1, profileName: 1 }
          );
          friendsList.push(...participants);
        }
      })
    );

    friendsList = _.uniqBy(friendsList, (friend) => friend._id.toString());
    friendsList = friendsList.slice(skip, friendsList.length);
    friendsList = _.take(friendsList, limit);

    return friendsList;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function setTyping({ chatID, isTyping, req }) {
  try {
    const chat = await Chat.findOne({
      _id: chatID,
    }).cache({ key: chatID });

    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    const profileIdx = chat.participants.findIndex(
      (el) => el.toString() === req.user.profileID.toString()
    );

    if (profileIdx > -1) {
      const payload = {
        action: {
          name: req.user.username,
          isTyping,
          chatID,
          userID: req.user._id,
        },
        participants: chat.participants,
      };

      const { action, participants } = payload;
      await pubsub.publish(MESSAGE_ACTION, {
        action,
        participants,
      });
    }

    return null;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  sendMessage,
  getMessages,
  removeSelf,
  readChat,
  inviteProfile,
  removeProfiles,
  getByID,
  getInbox,
  getFriends,
  setTyping,
  getChatPage,
};
