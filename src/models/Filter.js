import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const FilterSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  searchParams: {
    distance: {
      type: Number,
      default: 100,
    },
    distanceMetric: {
      type: String,
      default: "mi",
    },
    ageRange: {
      type: [Number],
      default: [18, 80],
    },
    interestedIn: {
      type: [String],
      default: [],
    },
  },
  blocked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "profile",
    },
  ],
});

FilterSchema.methods.toJSON = function f() {
  const filter = this;
  const filterObject = filter.toObject();

  return filterObject;
};

FilterSchema.plugin(timestamps);

const Filter = mongoose.model("filter", FilterSchema);
module.exports = Filter;
