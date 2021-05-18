import mongoose from "mongoose";

const SystemSchema = new mongoose.Schema({
  maintenance: {
    active: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  announcement: {
    message: {
      type: String,
      default: "",
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  malesNum: {
    type: Number,
    default: 799,
  },
  femalesNum: {
    type: Number,
    default: 334,
  },
  couplesNum: {
    type: Number,
    default: 64,
  },
  totalNum: {
    type: Number,
    default: 1238,
  },
});

SystemSchema.methods.toJSON = function f() {
  const system = this;
  const systemObject = system.toObject();

  return systemObject;
};

const System = mongoose.model("system", SystemSchema);
module.exports = System;
