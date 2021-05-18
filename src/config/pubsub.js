import { RedisPubSub } from "graphql-redis-subscriptions";

const Redis = require("ioredis");

const { REDISHOST, REDISPORT, REDISPASS } = global.secrets;

const options =
  process.env.NODE_ENV === "production"
    ? {
        host: REDISHOST,
        retry_strategy: (opt) => Math.max(opt.attempt * 100, 3000),
      }
    : {
        host: REDISHOST,
        port: REDISPORT,
        password: REDISPASS,
        retry_strategy: (opt) => Math.max(opt.attempt * 100, 3000),
      };

const redisPubSub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

export default redisPubSub;
