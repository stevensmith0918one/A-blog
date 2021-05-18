import * as Sentry from "@sentry/node";
import logger from "../../config/logger";

const { ObjectId } = require("mongoose").Types;

const _ = require("lodash");
const moment = require("moment");
const Event = require("../../models/Event");
const Chat = require("../../models/Chat");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { getDistance } = require("../../utils/distanceCalc");
const { clearHash } = require("../../utils/cache");
const {
  emailEventReminders,
  sendEmailToProfile,
  emailEventCancellations,
} = require("../../utils/email");

async function createEvent({
  eventname,
  image,
  description,
  type,
  startTime,
  endTime,
  tagline,
  interestedIn,
  kinks,
  address,
  lat,
  long,
  eventID,
  isImageAlt,
  req,
}) {
  try {
    const location = {
      loc: {
        type: "Point",
        coordinates: [long, lat],
      },
    };

    if (eventID !== undefined) {
      const event = await Event.findOne({
        _id: eventID,
      }).cache({ key: eventID });
      // need flag to only alter image if messed with
      let data;
      if (isImageAlt) {
        data = {
          eventname,
          image,
          description,
          type,
          startTime,
          endTime,
          tagline,
          interestedIn,
          kinks,
          address,
          lat,
          long,
          location,
        };
      } else {
        data = {
          eventname,
          description,
          type,
          startTime,
          endTime,
          tagline,
          interestedIn,
          kinks,
          address,
          lat,
          long,
          location,
        };
      }
      await event.updateOne({
        $set: data,
      });

      clearHash(eventID);
      return event;
    }

    const chat = new Chat({
      participants: [req.user.profileID],
      lastSeen: { userID: req.user._id, date: Date.now() },
      isEvent: true,
      ownerProfileID: req.user.profileID,
    });
    const blockedProfiles = await Profile.findById(req.user.profileID, {
      blockedProfileIDs: 1,
    });
    const event = await new Event({
      eventname,
      image,
      description,
      type,
      startTime,
      endTime,
      tagline,
      interestedIn,
      kinks,
      lat,
      long,
      address,
      location,
      ownerProfileID: req.user.profileID,
      chatID: chat._id,
      participants: [req.user.profileID],
      blocked: blockedProfiles.blockedProfileIDs,
    }).save();

    chat.eventID = event._id;

    await chat.save();

    return event;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function deleteEvent({ eventID, req }) {
  try {
    const event = await Event.findById({
      _id: eventID,
    }).cache({ key: eventID });

    if (event) {
      const users = [];
      const profiles = await Profile.find(
        {
          _id: { $in: event.participants },
          active: true,
        },
        { userIDs: 1 }
      );

      await Promise.all(
        profiles.map(async (pro) => {
          await Promise.all(
            pro.userIDs.map(async (id) => {
              const user = await User.findById(id, {
                notificationRules: 1,
                lang: 1,
                email: 1,
              });
              if (user.notificationRules.emailNotify) {
                users.push(user);
              }
            })
          );
        })
      );
      if (users.length > 0) {
        emailEventCancellations({
          users,
          eventName: event.eventname,
          eventDate: moment(event.startTime).format("LLLL"),
        });
      }
      if (event.ownerProfileID.toString() === req.user.profileID.toString()) {
        if (event.flagIDs.length > 0) {
          await Event.findOneAndUpdate(
            {
              _id: eventID,
            },
            {
              $set: {
                active: false,
              },
            }
          );

          await Chat.findOneAndUpdate(
            {
              _id: eventID,
            },
            {
              $set: {
                active: false,
              },
            }
          );
        } else {
          await Event.remove({
            _id: eventID,
          });
          await Chat.remove({
            eventID,
          });
        }

        const toNotify = event.participants.filter(
          (pro) => pro !== req.user.profileID.toString()
        );

        const notification = {
          toMemberIDs: toNotify,
          text: "has been canceled",
          name: event.eventname,
          date: new Date(),
        };

        Profile.addNotification(notification);

        clearHash(eventID);
        return notification;
      }
    }
    return null;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function searchEvents({ long, lat, maxDistance, req, limit, skip }) {
  try {
    await Profile.findByIdAndUpdate(req.user.profileID, {
      $set: {
        "loc.loc": {
          type: "Point",
          coordinates: [long, lat],
        },
      },
    });
    clearHash(req.user.profileID);

    const events = await Event.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [long, lat],
          },
          maxDistance: maxDistance * 1609.34, // miles to meter
          distanceMultiplier:
            req.user.distanceMetric === "km" ? 0.001 : 0.000621371, // meter to ki: miles
          distanceField: "distance",
          spherical: true,
        },
      },
      {
        $match: {
          $and: [
            {
              active: true,
              blocked: { $nin: [req.user.profileID] },
            },
          ],
        },
      },
    ])
      .skip(skip)
      .limit(limit)
      .sort("-startTime");

    // Block seeing blocked user on frontend
    const blockedProfiles = await Profile.findById(req.user.profileID, {
      blockedProfileIDs: 1,
    });
    events.forEach((event) => {
      if (event.ownerProfileID !== req.user.profileID) {
        // eslint-disable-next-line no-param-reassign
        event.participants = event.participants.filter(
          (x) => blockedProfiles.blockedProfileIDs.indexOf(x) < 0
        );
      }
    });

    return events;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getByID({ id, req }) {
  try {
    let event = await Event.findOne({
      _id: id,
      blocked: { $nin: [req.user.profileID] },
    }).cache({ key: id });

    if (!event) {
      return null;
    }

    let distance;
    if (req.user.distanceMetric === "km") {
      distance = getDistance(
        req.user.location.crds.lat,
        req.user.location.crds.long,
        event.lat,
        event.long,
        "K"
      );
    } else {
      distance = getDistance(
        req.user.location.crds.lat,
        req.user.location.crds.long,
        event.lat,
        event.long,
        "M"
      );
    }

    event = { ...event.toObject(), distance };

    const blockedProfiles = await Profile.findById(req.user.profileID, {
      blockedProfileIDs: 1,
    });

    if (event.ownerProfileID !== req.user.profileID) {
      // block those from being seen who have been blocked
      event.participants = event.participants.filter(
        (x) => blockedProfiles.blockedProfileIDs.indexOf(x) < 0
      );
    }

    return event;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function inviteProfile({ eventID, invitedProfiles, req }) {
  try {
    // Check Validation
    const event = await Event.findOne({
      _id: eventID,
    }).cache({ key: eventID });

    if (!event) {
      throw new Error("Client: Event not found.");
    }

    if (!event.active) {
      throw new Error("Client: Event no longer available.");
    }

    if (event.participants.indexOf(req.user.profileID) > 0) {
      throw new Error(
        "Client: Only Participants can invite others. (send a message first)"
      );
    }

    // eslint-disable-next-line no-param-reassign
    invitedProfiles = await invitedProfiles.filter(
      (el) => el !== event.ownerProfileID.toString()
    );

    if (invitedProfiles.length === 0) {
      throw new Error("Client: The event creator is already going");
    }

    // TODO: Undo
    // invitedProfiles = await invitedProfiles.filter(
    //   (el) =>
    //     event.participants.indexOf(el) < 0 && event.invited.indexOf(el) < 0
    // );

    await invitedProfiles.forEach(async (id) => {
      const profile = await Profile.findOne({ _id: id, active: true }).cache({
        key: id,
      });
      if (process.env.NODE_ENV !== "development") {
        await sendEmailToProfile({
          profile,
          fromUserID: req.user._id,
          fromUsername: req.user.username,
          eventName: event.eventname,
        });
      }
    });

    await Event.findByIdAndUpdate(eventID, {
      $push: {
        invited: [...invitedProfiles],
      },
    });

    const notification = {
      targetID: eventID,
      toMemberIDs: invitedProfiles,
      type: "event",
      text: "has invited you to an event",
      fromUserID: req.user._id,
      fromUsername: req.user.username,
      date: new Date(),
    };
    Profile.addNotification(notification);

    clearHash(eventID);

    return notification;
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
    return false;
  }
}

async function removeProfile({ eventID, removedProfiles, req }) {
  try {
    const event = await Event.findOne({
      _id: eventID,
    }).cache({ key: eventID });

    if (!event) {
      throw new Error("Client: Event not found.");
    }

    if (!event.active) {
      throw new Error("Client: Event no longer available.");
    }

    if (event.ownerProfileID.toString() !== req.user.profileID.toString()) {
      throw new Error("Client: Only the Owner can remove members.");
    }

    if (removedProfiles.indexOf(event.ownerProfileID.toString()) > -1) {
      throw new Error("Client: Can't remove the owner.");
    }
    // eslint-disable-next-line no-param-reassign
    removedProfiles = await Promise.all(
      await removedProfiles.map(async (profile) => {
        await event.updateOne({
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

        await Chat.findOneAndUpdate(
          {
            _id: eventID,
          },
          {
            $push: {
              blocked: profile,
            },
          }
        );

        return profile;
      })
    );

    if (removedProfiles.length === 0) {
      return false;
    }

    const chat = await Chat.findOne({
      _id: event.chatID,
    }).cache({ key: event.chatID });

    removedProfiles.forEach(async (profile) => {
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
        });
      }
    });

    await Profile.removeNotification({
      removeMemberIDs: removedProfiles,
      type: "event",
      targetID: eventID,
    });

    clearHash(eventID);
    clearHash(event.chatID);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function toggleAttend({ eventID, req }) {
  try {
    const event = await Event.findOne({
      _id: eventID,
    }).cache({ key: eventID });
    if (event.blocked.indexOf(req.user.profileID) > -1) return "";
    const { participants, invited } = event;

    const { profileID } = req.user;

    if (event.ownerProfileID.toString() === profileID.toString()) {
      throw new Error("Client: Creator must attend the event!");
    }

    if (participants.indexOf(profileID) > -1) {
      await event.updateOne({
        $pull: {
          participants: {
            $in: [profileID],
          },
        },
        $push: {
          invited: profileID,
        },
      });
    } else if (invited.indexOf(profileID) > -1) {
      await event.updateOne({
        $pull: {
          invited: {
            $in: [profileID],
          },
        },
        $push: {
          participants: profileID,
        },
      });
    } else if (event.type !== "private") {
      await event.updateOne({
        $push: {
          participants: profileID,
        },
      });
    } else {
      throw new Error("Client: Private Event = You must be invited to join.");
    }
    clearHash(eventID);

    return req.user.profileID;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getMyEvents(req) {
  try {
    let events = await Event.find({
      participants: req.user.profileID,
      active: true,
    });

    events = events.map((eve) => {
      let distance;
      if (req.user.distanceMetric === "km") {
        distance = getDistance(
          req.user.location.crds.lat,
          req.user.location.crds.long,
          eve.lat,
          eve.long,
          "K"
        );
      } else {
        distance = getDistance(
          req.user.location.crds.lat,
          req.user.location.crds.long,
          eve.lat,
          eve.long,
          "M"
        );
      }

      return { ...eve.toObject(), distance };
    });

    events = _.orderBy(events, ["startTime"], ["asc"]);

    return events;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function postComment({ chatID, text, req }) {
  try {
    if (chatID !== undefined) {
      const chat = await Chat.findById(chatID).cache({ key: chatID });

      // Does Chat exist
      if (!chat) {
        throw new Error("Client: Chat not found.");
      }

      // Does user have access to chat or are they just invited
      if (
        _.includes(
          chat.blocked.map((item) => item.toString()),
          req.user.profileID.toString()
        )
      ) {
        throw new Error("Client: Chat is no longer available.");
      }

      const comment = {
        id: ObjectId(),
        text,
        fromUser: req.user._id,
        type: "comment",
        createdAt: new Date(),
        chatID: chat._id,
        participants: chat.participants,
        invited: chat.invited,
      };

      await Chat.findByIdAndUpdate(
        chatID,
        {
          $set: {
            lastSeen: { userID: req.user._id, date: new Date() },
          },
          $push: { messages: comment },
        },
        {
          new: true,
        }
      );

      await clearHash(chatID);

      return comment;
    }
    return null;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getComments({ chatID, cursor, limit }) {
  try {
    const chat = await Chat.findById(chatID).cache({ key: chatID });

    if (!chat || chat.messages.length === 0) {
      return chat;
    }

    const messages = cursor
      ? await _.take(
          _.filter(
            _.orderBy(chat.messages, ["createdAt"], ["desc"]),
            ({ createdAt }) =>
              new Date(createdAt).getTime() < new Date(cursor).getTime()
          ),
          limit
        )
      : await _.take(_.orderBy(chat.messages, ["createdAt"], ["desc"]), limit);

    chat.messages = messages === null ? [] : messages;
    if (!chat) {
      throw new Error("Client: Chat not found.");
    }

    if (!chat.active) {
      throw new Error("Client: Chat no longer available.");
    }

    if (chat.participants === undefined) {
      throw new Error("Client: Chat room closed.");
    }

    return chat;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function sendEventReminders() {
  try {
    const start = moment().add(1, "day").startOf("day");
    const end = moment().add(1, "day").endOf("day");

    const events = await Event.find({
      startTime: { $gte: start, $lte: end },
      active: true,
      reminderSent: false,
    });

    Promise.all(
      events.map(async (el) => {
        const users = [];
        const profiles = await Profile.find(
          {
            _id: { $in: el.participants },
            active: true,
          },
          { userIDs: 1 }
        );

        await Promise.all(
          profiles.map(async (pro) => {
            await Promise.all(
              pro.userIDs.map(async (id) => {
                const user = await User.findById(id, {
                  notificationRules: 1,
                  lang: 1,
                  email: 1,
                });
                if (user.notificationRules.emailNotify) {
                  users.push(user);
                }
              })
            );
          })
        );
        const profileIDs = profiles.map((pro) => pro.id);

        const notification = {
          targetID: el._id,
          toMemberIDs: profileIDs,
          type: "event",
          text: "is coming up soon.",
          name: el.eventname,
        };

        Profile.addNotification(notification);

        if (users.length > 0) {
          emailEventReminders({
            users,
            eventName: el.eventname,
            eventDate: moment(el.startTime).format("LLLL"),
            eventID: el._id,
          });
        }

        await Event.findByIdAndUpdate(el._id, {
          $set: {
            reminderSent: true,
          },
        });
      })
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function deleteOldEvents() {
  try {
    const end = moment().subtract(1, "day").endOf("day");

    const events = await Event.find({
      endTime: { $lte: end },
    });

    Promise.all(
      events.map(async (el) => {
        await Event.findByIdAndDelete(el._id);
      })
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

module.exports = {
  createEvent,
  deleteEvent,
  searchEvents,
  getByID,
  inviteProfile,
  removeProfile,
  toggleAttend,
  getMyEvents,
  postComment,
  getComments,
  sendEventReminders,
  deleteOldEvents,
};
