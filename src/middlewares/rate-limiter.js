import RateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

const { client } = require("../utils/cache");

// Rate limiter
// TODO: Test best number

const limiter = RateLimit({
  store: new RedisStore({ client }),
  max: 75,
  windowMs: 30 * 1000,
});

export default limiter;
