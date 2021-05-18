/**
 * Application Entry point
 * @type {createApplication}
 */
import * as Sentry from "@sentry/node";
// import AdminBro from "admin-bro";
// import AdminBroExpress from "@admin-bro/express";
// import AdminBroMongoose from "@admin-bro/mongoose";
import compression from "compression";
import cors from "cors";
import express from "express";
import expressPlayground from "graphql-playground-middleware-express";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import xss from "xss-clean";
import authMiddleware from "./middlewares/auth";
import logger from "./config/logger";
import graphqlMiddleware from "./middlewares/graphql";
import limiter from "./middlewares/rate-limiter";

const User = require("./models/User");
const Profile = require("./models/Profile");
const RedisClient = require("./utils/cache").client;
const FTMHandler = require("./utils/videoQueueHandler");
const mongodb = require("./database");
const config = require("./config/config");

const redisRateLimitKeyPrefix = "rl:";

const app = express();
(async () => {
  // const connection =
  await mongodb.connect();
  if (process.env.NODE_ENV !== "production") {
    // const options = {
    //   databases: [connection],
    // };
    // AdminBro.registerAdapter(AdminBroMongoose);
    // const adminBro = new AdminBro(options);
    // const adminRouter = AdminBroExpress.buildRouter(adminBro);
    // app.use(adminBro.options.rootPath, adminRouter);
  }
})();

const whitelist =
  process.env.NODE_ENV === "production"
    ? config.whitelist.production
    : config.whitelist.other;

const corsOptionsDelegate = function f(req, callback) {
  const corsOptions = {
    origin: whitelist.indexOf(req.header("Origin")) !== -1,
    credentials: true,
    maxAge: 600,
  };

  callback(null, corsOptions); // callback expects two parameters: error and options
};

Sentry.init({
  dsn: global.secrets.SENTRY_DSN,
  ignoreErrors: ["Client:", "authenticated"],
});

app.use(morgan("dev", { stream: logger.stream }));
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());
// Helmet for security like xssFilter, dnsPrefetchControl, remove hidePoweredBy
app.use(helmet());
// Protect against HTTP Parameter Pollution attacks
app.use(hpp());
// filter input from users to prevent XSS attacks.
app.use(xss());
// sanitizes user-supplied data to prevent MongoDB Operator Injection
app.use(mongoSanitize());
// CORS
app.use(cors(corsOptionsDelegate));

/**
 * Express configuration.
 */
app.use(compression());
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(authMiddleware);

/**
 * GraphQL server
 */
if (process.env.NODE_ENV === "production") {
  app.use("/graphql", limiter, graphqlMiddleware);
} else {
  app.use("/graphql", graphqlMiddleware);
}

/**
 * Refresh token
 */
app.post("/refresh", async (req, res) => {
  try {
    const newtokens = await User.refreshToken(req.body.refreshToken, req.ip);
    res.send(newtokens);
  } catch (e) {
    logger.error(e);
  }
});

/**
 * Captcha resolver
 */
app.post("/allowIp", async (req, res) => {
  try {
    if (req.ip && req.body.capToken) {
      // TODO: Move resolve to call
      const resolve = await User.resolveCapLock({
        capToken: req.body.capToken,
        ip: req.ip,
      });

      if (resolve) {
        const key = redisRateLimitKeyPrefix + req.ip;
        RedisClient.del(key);
        res.status(200).send(true);
      } else {
        res.status(200).send(false);
      }
    }
  } catch (e) {
    logger.error(e);
    res.status(500).send("Client: Recaptcha Server Error");
  }
});

/**
 * Set offline status
 */
app.get("/offline", async (req, res) => {
  if (req.query.token) {
    await Profile.offline(req.query.token, req.ip);
    FTMHandler.handleFTMQueue(req.query.token, "exit");
  }
  res.status(204);
});

if (global.secrets.NODE_ENV !== "production") {
  app.get(
    "/playground",
    expressPlayground({
      endpoint: "/graphql",
      subscriptionsEndpoint: "/subscriptions",
    })
  );
}

app.get("/healthz", function f(req, res) {
  // do app logic here to determine if app is truly healthy
  // you should return 200 if healthy, and anything else will fail
  // if you want, you should be able to restrict this to localhost (include ipv4 and ipv6)
  res.status(200).send("I am happy and healthy\n");
});

/**
 * Manage Video Queue
 */
app.use("/vctrl", limiter, async (req, res) => {
  if (req.query.token && req.query.action) {
    FTMHandler.handleFTMQueue(req.query.token, req.query.action);
  } else if (req.query.token && req.query.chatID) {
    FTMHandler.handleLeaveVChat(req.query.token, req.query.chatID);
  }
  res.status(204);
});

module.exports = app;
