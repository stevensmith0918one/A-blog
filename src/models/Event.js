const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { locSchema } = require("./Generic");

const EventsSchema = new mongoose.Schema({
  eventname: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  description: {
    type: String,
    default:
      "This member hasn't filled in their about me yet. Send a message to find out more about them.",
  },
  type: {
    type: String,
    default: "public",
  },
  address: {
    type: String,
    default: "",
  },
  lat: {
    type: Number,
  },
  long: {
    type: Number,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  tagline: {
    type: String,
    default: "",
  },
  interestedIn: [
    {
      type: String,
    },
  ],
  kinks: [
    {
      type: String,
    },
  ],
  maxDistance: {
    type: Number,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "profile",
    default: [],
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
  location: locSchema,
  flagIDs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "flag",
    default: [],
  },
  chatID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chat",
    required: true,
  },
  ownerProfileID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "profile",
    required: true,
  },
});

EventsSchema.statics.castID = (id) => mongoose.Types.ObjectId(id);
EventsSchema.index({ "location.loc": "2dsphere" });
EventsSchema.index({ startTime: -1 });
EventsSchema.plugin(timestamps);
const Event = mongoose.model("event", EventsSchema);
Event.createIndexes({ "location.loc": "2dsphere" });
module.exports = Event;
