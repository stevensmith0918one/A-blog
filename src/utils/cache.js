/* eslint-disable consistent-return */
/* eslint-disable new-cap */
/* eslint-disable prefer-rest-params */
import redis from "redis";
import util from "util";
import * as Sentry from "@sentry/node";
import mongoose from "mongoose";
import logger from "../config/logger";

const client =
  process.env.NODE_ENV === "production"
    ? redis.createClient({
        host: global.secrets.REDISHOST,
      })
    : redis.createClient({
        host: global.secrets.REDISHOST,
        port: global.secrets.REDISPORT,
        auth_pass: global.secrets.REDISPASS,
      });

client.on("error", function f(err) {
  logger.info(`Redis Error :${err}`);
});

client.on("connect", function f() {
  logger.info(`Redis Connected on:${global.secrets.REDISHOST}`);
});

client.hget = util.promisify(client.hget);
client.get = util.promisify(client.get);
const { exec } = mongoose.Query.prototype;

mongoose.Query.prototype.cache = function f(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");

  return this;
};

mongoose.Query.prototype.exec = async function f() {
  try {
    if (!this.useCache) return exec.apply(this, arguments);

    const key = JSON.stringify({
      ...this.getQuery(),
      collection: this.mongooseCollection.name,
    });
    // See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key);

    // If we do, return that
    if (cacheValue) {
      const doc = JSON.parse(cacheValue);

      return Array.isArray(doc)
        ? doc.map((d) => new this.model(d))
        : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments);

    if (result) {
      client.hset(this.hashKey, key, JSON.stringify(result.toObject()));
    }

    if (this.mongooseCollection.name !== "systems") {
      client.expire(this.hashKey, 1800); // 30 minutes cache
    }

    return result;
  } catch (e) {
    Sentry.captureException(e);
  }
};

module.exports = {
  client,
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
