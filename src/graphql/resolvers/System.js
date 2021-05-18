import * as Sentry from "@sentry/node";

const sanitize = require("sanitize-filename");
const querystring = require("querystring");
const System = require("../../models/System");
const URL = require("../../models/URL");
const { clearHash, client } = require("../../utils/cache");
const Profile = require("../../models/Profile");
const Event = require("../../models/Event");
const Affiliate = require("../../models/Affiliate");

const VIDEO_QUEUE_KEY = "VIDEO_QUEUE_KEY";

async function getDemoCounts() {
  try {
    // TODO:Enable at 1k women users
    const system = await System.findOne({}).cache({ key: "system" });
    if (!system) {
      return { malesNum: 899, femalesNum: 651, couplesNum: 64 };
    }
    let { malesNum, femalesNum, couplesNum } = system;
    malesNum += 799;
    femalesNum += 574;
    couplesNum += 64;
    return { malesNum, femalesNum, couplesNum };
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function setAnnouncement({ message, endDate }) {
  try {
    await System.findOneAndUpdate(
      {},
      {
        $set: { announcement: { message, endDate } },
      }
    );

    clearHash("system");

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
async function removeAnnouncement() {
  try {
    await System.findOneAndUpdate(
      {},
      {
        $set: { announcement: { message: "" } },
      }
    );
    clearHash("system");

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}
async function getAnnouncement() {
  try {
    const system = await System.findOne({}).cache({ key: "system" });
    if (system) {
      if (
        system.announcement &&
        system.announcement.endDate > Date.now() &&
        system.announcement.message !== ""
      ) {
        return system.announcement.message;
      }
    }

    return null;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getFullLink(shortenedUrl) {
  try {
    if (!shortenedUrl) {
      throw new Error("Client: Please enter a valid URL");
    }
    const match = await URL.findOneAndUpdate(
      { shortenedUrl },
      { $set: { lastUsed: Date.now() } }
    );
    if (!match) {
      throw new Error("Client: Please enter a valid URL");
    }

    // Track Visits
    const queryStrJSON = querystring.parse(match.fullUrl);

    if (queryStrJSON.cid) {
      await Affiliate.findOneAndUpdate(
        { "campaigns._id": queryStrJSON.cid },
        {
          $inc: {
            "campaigns.$.totalVisits": 1,
            "campaigns.$.visits.$[].number": 1,
          },
        }
      );
    }
    return match.fullUrl;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function makeShortenedURL() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return `${text}`;
}

async function setFullLink(destination) {
  try {
    // Save all URL text after /new/ in this var
    const shortenedUrlToCreate = sanitize(destination);

    // If URL is valid, search for existing record in schema
    const url = await URL.findOne(
      { fullUrl: shortenedUrlToCreate },
      "-_id fullUrl shortenedUrl"
    );
    if (url) {
      return url.shortenedUrl;
    }
    // Create a 5 random letter and number string for the shortened URL
    let randomString = makeShortenedURL();
    // Check if randomString is already in use, if so, run once more
    URL.findOne({ shortenedUrl: randomString }, function f(err, url2) {
      if (err) {
        throw new Error(
          "Client: Error occurred. Please contact support at support@foxtailapp.com"
        );
      } else if (url2) {
        randomString = makeShortenedURL();
      }
      return {};
    });
    // Create new mongodb document for shortened URL
    const newInstance = new URL({
      fullUrl: shortenedUrlToCreate,
      shortenedUrl: randomString,
    });
    newInstance.save();
    return randomString;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function getFTMeetCount() {
  try {
    let videoQueue = await client.get(VIDEO_QUEUE_KEY);
    if (videoQueue) {
      videoQueue = JSON.parse(videoQueue);
      return videoQueue.length;
    }
    return 0;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

function hiccup() {
  Profile.ensureIndexes();
  Event.ensureIndexes();
}

module.exports = {
  setAnnouncement,
  removeAnnouncement,
  getAnnouncement,
  getDemoCounts,
  getFullLink,
  setFullLink,
  hiccup,
  getFTMeetCount,
};
