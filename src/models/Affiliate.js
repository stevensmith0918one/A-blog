const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

// Every admin has an email and password.  The password is not stored as
// plain text - see the authentication helpers below.
const AffiliateSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  campaigns: {
    type: [
      {
        name: {
          type: String,
        },
        totalVisits: {
          type: Number,
          default: 0,
        },
        totalSignups: {
          type: Number,
          default: 0,
        },
        totalPurchases: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now(),
        },
        visits: {
          type: [
            {
              date: {
                type: Date,
              },
              number: {
                type: Number,
                default: 0,
              },
            },
          ],
          default: [{ date: Date.now(), number: 0 }],
        },
        signups: {
          type: [
            {
              date: {
                type: Date,
              },
              number: {
                type: Number,
                default: 0,
              },
            },
          ],
          default: [{ date: Date.now(), number: 0 }],
        },
        purchases: {
          type: [
            {
              date: {
                type: Date,
              },
              number: {
                type: Number,
                default: 0,
              },
            },
          ],
          default: [{ date: Date.now(), number: 0 }],
        },
      },
    ],
    default: [],
  },
  active: {
    type: Boolean,
    default: true,
  },

  lastActive: {
    type: Date,
    default: Date.now(),
  },
});

AffiliateSchema.plugin(timestamps);

const Affiliate = mongoose.model("affiliate", AffiliateSchema);

module.exports = Affiliate;
