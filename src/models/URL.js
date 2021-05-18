import mongoose from "mongoose";

const URLSchema = new mongoose.Schema({
  fullUrl: String,
  shortenedUrl: String,
  totalRefs: { type: Number, default: 0 },
  lastUsed: {
    type: Date,
    default: Date.now(),
  },
});

const URL = mongoose.model("url", URLSchema);
module.exports = URL;
