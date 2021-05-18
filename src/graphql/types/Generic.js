/* eslint-disable global-require */
import * as Sentry from "@sentry/node";

const GraphQL = require("graphql");

const {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFloat,
} = GraphQL;
const { GraphQLDateTime } = require("graphql-iso-date");
const { ObjectId } = require("mongoose").Types;
const Profile = require("../../models/Profile");
const { getSignedUrl } = require("../../middlewares/uploadPicture");

ObjectId.prototype.valueOf = function f() {
  return this.toString();
};

const coordiantesType = new GraphQLObjectType({
  name: "Coordiantes",
  fields: {
    lat: { type: GraphQLFloat },
    long: { type: GraphQLFloat },
  },
});

const locationType = new GraphQLObjectType({
  name: "location",
  fields: {
    city: {
      type: GraphQLString,
    },
    crds: { type: coordiantesType },
  },
});

exports.locationType = locationType;

exports.mobileNumberInputType = new GraphQLInputObjectType({
  name: "mobileNumberInput",
  description: "Accept only mobile number in input",
  fields: () => ({
    mobileNumber: {
      type: GraphQLString,
      description: "Phone number of the user",
    },
  }),
});

exports.messageOutputType = new GraphQLObjectType({
  name: "messageOutput",
  description: "Send success message",
  fields: () => ({
    message: {
      type: GraphQLString,
      description: "Success message string",
    },
  }),
});

exports.s3PayloadType = new GraphQLObjectType({
  name: "s3Payload",
  description: "AWS upload url and get url key",
  fields: () => ({
    signedRequest: {
      type: GraphQLNonNull(GraphQLString),
      description: "aws upload url",
    },
    key: {
      type: GraphQLNonNull(GraphQLString),
      description: "aws view key",
    },
  }),
});

exports.initOutputType = new GraphQLObjectType({
  name: "initOutput",
  description: "Init response structure",
  fields: () => ({
    appVersion: {
      type: GraphQLString,
      description: "Return app version",
    },
  }),
});

exports.tokenType = new GraphQLObjectType({
  name: "Token",
  description: "Auth token",
  fields: {
    access: {
      type: GraphQLString,
    },
    token: {
      type: GraphQLString,
    },
  },
});

exports.userInfoType = new GraphQLObjectType({
  name: "UserInfo",
  description: "User Info for session",
  fields: {
    userID: {
      type: GraphQLID,
    },
    profileID: {
      type: GraphQLID,
    },
    profilePic: {
      type: GraphQLString,
      async resolve(parentValue, args, req) {
        if (parentValue.profilePic) {
          const sign = await getSignedUrl({
            key: parentValue.profilePic,
            width: 36,
            height: 36,
            isMobile: parentValue.isMobile,
            isProfile: true,
          });
          return sign;
        }
        // TODO: Delete this entire else after time passed -MArch
        try {
          const picurl = (await Profile.findById(parentValue.profileID))
            .profilePic;
          req.user.profilePic = picurl;
          req.user.update();
          if (picurl !== "") {
            const sign = await getSignedUrl({
              key: picurl,
              width: 36,
              height: 36,
              isMobile: parentValue.isMobile,
              isProfile: true,
            });
            return sign;
          }
        } catch (err) {
          Sentry.captureException(err);
        }

        return "";
      },
    },
    username: {
      type: GraphQLString,
    },
    blackMember: {
      type: new GraphQLObjectType({
        name: "BlackMembershipInfo",
        fields: {
          active: {
            type: GraphQLBoolean,
          },
          renewalDate: {
            type: GraphQLDateTime,
          },
        },
      }),
    },
    isProfileOK: {
      type: GraphQLBoolean,
    },
    isEmailOK: {
      type: GraphQLBoolean,
    },
    location: {
      type: locationType,
    },
    distanceMetric: {
      type: GraphQLString,
    },
    coupleProfileName: {
      type: GraphQLString,
    },
    active: {
      type: GraphQLBoolean,
    },
    announcement: {
      type: GraphQLString,
    },
    captchaReq: {
      type: GraphQLBoolean,
    },
    likesSent: {
      type: GraphQLInt,
    },
    msgsSent: {
      type: GraphQLInt,
    },
    createdAt: {
      type: GraphQLDateTime,
    },
  },
});

exports.notificationType = new GraphQLObjectType({
  name: "NotificationType",
  fields: {
    id: {
      type: GraphQLString,
      resolve(parentValue) {
        return parentValue._id;
      },
    },
    targetID: {
      type: GraphQLString,
    },
    type: {
      type: GraphQLString,
    },
    body: {
      type: GraphQLString,
    },
    link: {
      type: GraphQLString,
    },
    title: {
      type: GraphQLString,
    },
    text: {
      type: GraphQLString,
    },
    name: {
      type: GraphQLString,
    },
    event: {
      type: GraphQLString,
    },
    fromProfile: {
      type: new GraphQLObjectType({
        name: "NotifySenderType",
        fields: {
          profileName: {
            type: GraphQLString,
          },
          profilePic: {
            type: GraphQLString,
            async resolve(parentValue) {
              if (parentValue.profilePic !== "") {
                const sign = await getSignedUrl({
                  key: parentValue.profilePic,
                  width: 36,
                  height: 36,
                  isMobile: parentValue.isMobile,
                  isProfile: true,
                });
                return sign;
              }
              return "";
            },
          },
        },
      }),
      resolve(parentValue) {
        return Profile.findOne(
          {
            userIDs: parentValue.fromUserID,
            active: true,
          },
          { profileName: 1, profilePic: 1 }
        );
      },
    },
    date: {
      type: GraphQLDateTime,
    },
    read: {
      type: GraphQLBoolean,
    },
    seen: {
      type: GraphQLBoolean,
    },
    coupleProID: {
      type: GraphQLID,
    },
  },
});

exports.photoType = new GraphQLObjectType({
  name: "PhotoType",
  fields: {
    id: {
      type: GraphQLString,
      resolve(parentValue) {
        return parentValue._id;
      },
    },
    key: {
      type: GraphQLString,
      resolve(parentValue) {
        return parentValue.url;
      },
    },
    smallUrl: {
      type: GraphQLString,
      async resolve(parentValue) {
        if (parentValue.url !== "") {
          if (parentValue.url === "private") {
            return "private";
          }
          const sign = await getSignedUrl({
            key: parentValue.url,
            width: 113,
            height: 113,
            isMobile: parentValue.isMobile,
            isProfile: true,
          });
          return sign;
        }
        return "";
      },
    },
    url: {
      type: GraphQLString,
      async resolve(parentValue) {
        if (parentValue.url !== "") {
          if (parentValue.url === "private") {
            return "private";
          }
          const sign = await getSignedUrl({
            key: parentValue.url,
            isMobile: parentValue.isMobile,
            maxW: parentValue.maxW,
            maxH: parentValue.maxH,
          });
          return sign;
        }
        return "";
      },
    },
  },
});

exports.linkType = new GraphQLObjectType({
  name: "LinkType",
  fields: {
    profileID: {
      type: GraphQLID,
    },
    partnerName: {
      type: GraphQLString,
    },
  },
});

exports.verificationType = new GraphQLObjectType({
  name: "VerificationType",
  fields: {
    image: {
      type: GraphQLString,
    },
    active: {
      type: GraphQLBoolean,
    },
  },
});

exports.overviewCountsType = new GraphQLObjectType({
  name: "OverviewCountsType",
  fields: () => {
    const MessageType = require("./Message");

    return {
      msgsCount: {
        type: GraphQLInt,
      },
      noticesCount: {
        type: GraphQLInt,
      },
      alert: { type: MessageType },
      newMsg: {
        type: GraphQLBoolean,
      },
    };
  },
});

// TODO: add is mobile
exports.searchProfileResType = new GraphQLObjectType({
  name: "SearchProfileResType",
  fields: () => {
    const ProfileType = require("./Profile");
    return {
      profiles: {
        type: new GraphQLList(ProfileType),
      },
      featuredProfiles: {
        type: new GraphQLList(ProfileType),
      },
      message: {
        type: GraphQLString,
      },
    };
  },
});

exports.friendItemType = new GraphQLObjectType({
  name: "FriendItemType",
  fields: {
    profileName: {
      type: GraphQLString,
    },
    profilePic: {
      type: GraphQLString,
      async resolve(parentValue) {
        if (parentValue.profilePic !== "") {
          const sign = await getSignedUrl({
            key: parentValue.profilePic,
            width: parentValue.width,
            height: parentValue.height,
            isMobile: parentValue.isMobile,
            isProfile: true,
          });
          return sign;
        }
        return "";
      },
    },
    id: {
      type: GraphQLID,
    },
  },
});

exports.demoCountsType = new GraphQLObjectType({
  name: "DemoCountsType",
  fields: {
    malesNum: {
      type: GraphQLInt,
    },
    femalesNum: {
      type: GraphQLInt,
    },
    couplesNum: {
      type: GraphQLInt,
    },
  },
});

exports.msgActionType = new GraphQLObjectType({
  name: "MsgActionType",
  fields: {
    name: {
      type: GraphQLString,
    },
    isTyping: {
      type: GraphQLBoolean,
    },
    isActive: {
      type: GraphQLBoolean,
    },
    seenBy: { type: GraphQLInt },
    chatID: {
      type: GraphQLID,
    },
  },
});

exports.chatInfoType = new GraphQLObjectType({
  name: "ChatInfoType",
  fields: {
    rn: {
      type: GraphQLString,
    },
    p: {
      type: GraphQLString,
    },
  },
});

exports.chatRoomType = new GraphQLObjectType({
  name: "chatRoomType",
  fields: {
    name: {
      type: GraphQLString,
      resolve(parentValue) {
        return parentValue.name.replace("city-", "").replace("state-", "");
      },
    },
    numParticipants: {
      type: GraphQLInt,
      resolve(parentValue) {
        return parentValue.participants.length;
      },
    },
    id: {
      type: GraphQLID,
    },
  },
});
