import * as Sentry from "@sentry/node";
import moment from "moment";
import ImgixClient from "imgix-core-js";
import dotenv from "dotenv";
import AWS from "aws-sdk";
import logger from "../config/logger";

if (global.secrets.NODE_ENV !== "production") dotenv.config();

const s3 = new AWS.S3();

async function s3SignUrl({ filetype, userID }) {
  try {
    const now = moment(new Date()).format("YYYY-MM-DD-HH-mm-ss");
    const key = `imgs/${now}-${userID}.jpg`;
    const signedRequest = await s3.getSignedUrlPromise("putObject", {
      Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
      ContentType: filetype,
      Key: key,
      Expires: 120,
    });

    return { signedRequest, key };
  } catch (e) {
    Sentry.captureException(e);
    logger.error("s3SignUrl error:", e);
    throw new Error(e.message);
  }
}

async function getSignedUrl({ key }) {
  try {
    let url;
    // TODO: MOVE THESE TO AWS SECRETS
    try {
      new ImgixClient({
        domain:
          process.env.NODE_ENV === "production"
            ? "foxtail.imgix.net"
            : "ft-dev.imgix.net",
        secureURLToken:
          process.env.NODE_ENV === "production"
            ? "btwzyNZ7SyMrcuXn"
            : "cfRsFeEyynyPG8hM",
      });
      // TODO: UNDO when AWS works
      // url =
      //   width !== undefined
      //     ? client.buildURL(key, {
      //       w: width,
      //       h: height,
      //       fit: isProfile ? "crop" : "max",
      //       auto: "format,compress",
      //       crop: "faces,entropy,edges",
      //       dpr: isMobile ? 2 : 1,
      //     })
      //     : client.buildURL(key, {
      //       fit: "max",
      //       auto: "format,compress",
      //       dpr: isMobile ? 2 : 1,
      //     });
      url = await s3.getSignedUrlPromise("getObject", {
        Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
        Key: key,
        Expires: 3600,
      });
    } catch (e) {
      Sentry.captureException(e);
      logger.error("getSignedUrl error:", e);
      url = await s3.getSignedUrlPromise("getObject", {
        Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
        Key: key,
        Expires: 3600,
      });
    }
    // for test without using aws
    // const url = "";
    return url;
  } catch (e) {
    Sentry.captureException(e);
    logger.error("Error in upload picture", e);
    throw new Error(e.message);
  }
}

const deleteFromS3 = (keys) => {
  try {
    const keyObjs = Array.from(keys.map((key) => (key === "" ? "" : { key })));
    s3.deleteObjects(
      {
        Bucket: global.secrets.AWS_PROFILE_IMAGE_BUCKET,
        Delete: {
          Objects: keyObjs,
          Quiet: false,
        },
      },
      function error(err) {
        if (err) logger.info(err, err.stack);
      }
    );

    return true;
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
};

module.exports = { s3SignUrl, getSignedUrl, deleteFromS3 };
