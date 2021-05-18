import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const ChatsSchema = new mongoose.Schema({
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "profile",
    required: true,
    default: [],
  },
  name: {
    type: String,
    min: 3,
    max: 40,
  },
  eventID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "event",
  },
  isChatroom: {
    type: Boolean,
    default: false,
  },
  invited: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "profile",
    default: [],
  },
  blocked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "profile",
    },
  ],
  ownerProfileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "profile",
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  videoActive: {
    type: Boolean,
    default: false,
  },
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "flag",
    default: [],
  },
  messages: [
    {
      fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
      text: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      seenBy: {
        type: Number,
        default: 0,
      },
    },
  ],
  lastSeen: [
    {
      userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  roomName: {
    type: String,
    default: null,
  },
});
ChatsSchema.plugin((schema) => {
  /* eslint no-param-reassign: "error" */
  schema.options.usePushEach = true;
});
ChatsSchema.methods.toJSON = function f() {
  const chat = this;
  const chatObject = chat.toObject();

  return chatObject;
};

ChatsSchema.plugin(timestamps);
ChatsSchema.index({ "messages.createdAt": -1 });

const Chats = mongoose.model("chat", ChatsSchema);
module.exports = Chats;
