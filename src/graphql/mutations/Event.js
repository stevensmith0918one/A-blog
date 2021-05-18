import pubsub from "../../config/pubsub";

const GraphQL = require("graphql");
const validator = require("validator");
const auth = require("../../config/auth");
const {
  sexOptions,
  kinkOptions,
  eventTypeOptions,
} = require("../../config/listOptions");
const { EventType } = require("../types/Event");
const EventResolver = require("../resolvers/Event");

const NOTICE_ADDED = "NOTICE_ADDED";
const MESSAGE_ADDED = "MESSAGE_ADDED";

const {
  GraphQLFloat,
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLBoolean,
} = GraphQL;

module.exports = {
  createEvent: {
    type: EventType,
    args: {
      eventname: {
        type: new GraphQLNonNull(GraphQLString),
      },
      tagline: {
        type: GraphQLString,
      },
      image: {
        type: GraphQLString,
      },
      description: {
        type: new GraphQLNonNull(GraphQLString),
      },
      type: {
        type: new GraphQLNonNull(GraphQLString),
      },
      startTime: {
        type: new GraphQLNonNull(GraphQLString),
      },
      endTime: {
        type: new GraphQLNonNull(GraphQLString),
      },
      address: {
        type: new GraphQLNonNull(GraphQLString),
      },
      interestedIn: {
        type: new GraphQLList(GraphQLString),
      },
      kinks: {
        type: new GraphQLList(GraphQLString),
      },
      lat: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
      long: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
      isImageAlt: {
        type: GraphQLBoolean,
      },
      eventID: {
        type: GraphQLID,
      },
    },
    resolve(
      parentValue,
      {
        eventname,
        tagline,
        image,
        description,
        type,
        startTime,
        endTime,
        interestedIn,
        kinks,
        address,
        lat,
        long,
        isImageAlt,
        eventID,
      },
      req
    ) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature"
          );
        }
        if (
          !validator.isLength(eventname, {
            min: 3,
            max: 120,
          })
        ) {
          throw new Error(
            "Client: Event name should be between 3 and 120 characters."
          );
        }

        if (
          !validator.isLength(description, {
            min: 10,
            max: 2500,
          })
        ) {
          throw new Error(
            "Client: Event description should be between 10 and 2500 characters."
          );
        }

        if (!validator.isIn(type, eventTypeOptions)) {
          throw new TypeError("Client: Event Type is invalid.");
        }

        if (!validator.isAfter(endTime, startTime)) {
          throw new Error(
            "Client: Start date/time must be before End date/time."
          );
        }
        if (!validator.isBefore(startTime, endTime)) {
          throw new Error(
            "Client: End date/time must be before Start date/time."
          );
        }

        if (
          !validator.isLength(address, {
            max: 240,
          })
        ) {
          throw new Error(
            "Client: Address should be no more than 240 characters."
          );
        }

        if (!validator.isFloat(`${long}`) || !validator.isFloat(`${lat}`)) {
          throw new TypeError("Client: Location is invalid.");
        }

        if (interestedIn) {
          interestedIn.forEach((element) => {
            if (!validator.isIn(element, sexOptions)) {
              throw new Error("Client: Invalid interested in selection.");
            }
          });
        }

        if (kinks) {
          kinks.forEach((element) => {
            if (!validator.isIn(element, kinkOptions)) {
              throw new Error("Client: Invalid kink in selection.");
            }
          });
        }

        return EventResolver.createEvent({
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
        });
      }
      return null;
    },
  },

  deleteEvent: {
    type: GraphQLBoolean,
    args: {
      eventID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    async resolve(parentValue, { eventID }, req) {
      if (auth.isAuthenticated(req)) {
        const notification = await EventResolver.deleteEvent({
          eventID,
          req,
        });

        if (notification.length === 0) {
          // Already invited
          return true;
        }

        await pubsub.publish(NOTICE_ADDED, {
          notification,
        });
        return true;
      }
      return null;
    },
  },

  inviteProfile: {
    type: GraphQLBoolean,
    args: {
      eventID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      invitedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
    },
    async resolve(parentValue, { eventID, invitedProfiles }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature"
          );
        }
        const notification = await EventResolver.inviteProfile({
          eventID,
          invitedProfiles,
          req,
        });

        if (notification.length === 0) {
          // Already invited
          return true;
        }

        await pubsub.publish(NOTICE_ADDED, {
          notification,
        });

        return true;
      }
      return null;
    },
  },

  removeProfile: {
    type: GraphQLBoolean,
    args: {
      eventID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      removedProfiles: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLID)),
      },
    },
    resolve(parentValue, { eventID, removedProfiles }, req) {
      if (auth.isAuthenticated(req)) {
        return EventResolver.removeProfile({
          eventID,
          removedProfiles,
          req,
        });
      }
      return null;
    },
  },

  toggleAttend: {
    type: GraphQLID,
    args: {
      eventID: {
        type: new GraphQLNonNull(GraphQLID),
      },
    },
    resolve(parentValue, { eventID }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature"
          );
        }
        return EventResolver.toggleAttend({
          eventID,
          req,
        });
      }
      return null;
    },
  },

  postComment: {
    type: GraphQLBoolean,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID),
      },
      text: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    async resolve(parentValue, { chatID, text }, req) {
      if (auth.isAuthenticated(req)) {
        if (!req.user.isProfileOK) {
          throw new Error(
            "Client: Please complete your profile to use this feature"
          );
        }
        const message = await EventResolver.postComment({
          chatID,
          text,
          req,
        });

        await pubsub.publish(MESSAGE_ADDED, {
          message,
        });
        return true;
      }
      return null;
    },
  },

  deleteOldEvents: {
    type: GraphQLBoolean,
    args: {},
    resolve() {
      return EventResolver.deleteOldEvents();
    },
  },
};
