import { createServer } from "http";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import "./config/cron";
import logger from "./config/logger";

const schema = require("./graphql");
const app = require("./app");
const System = require("./models/System");
const SystemResolver = require("./graphql/resolvers/System");
const User = require("./models/User");

const server = createServer(app);

/**
 * Start Express server.
 */
server.listen(process.env.PORT || global.secrets.PORT, () => {
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      onConnect: async ({ token, refreshToken }) => {
        try {
          if (token && refreshToken) {
            const user = await User.findByToken(token);

            if (user) {
              return { user };
            }
          }

          throw new Error("Client:You're not logged in (or authenticated).");
        } catch (e) {
          throw new Error(
            `Error has occured in authentication. Error:${e.message}`
          );
        }
      },
    },
    {
      server,
      path: "/subscriptions",
    }
  );
  logger.info(`Process Node: ${process.env.NODE_ENV}`);
  logger.info(
    `GraphQL Server is now running on localhost:${global.secrets.PORT}/graphql`
  );
  logger.info(
    `Subscriptions are running on localhost:${global.secrets.PORT}/subscriptions`
  );

  let system = System.findOne({})
    .cache({ key: "system" })
    .then((res) => {
      if (res === null) {
        system = new System();
        system.save();
      }
      if (!system) {
        throw new Error("System Error");
      }
      SystemResolver.hiccup();
      logger.info("System document loaded.");
    })
    .catch((e) => {
      logger.error(e);
    });
});

// process.on("uncaughtException", function() {
//   console.info("Got SIGINT (aka ctrl-c in docker). Graceful shutdown ");
// });

// quit on ctrl-c when running docker in terminal
process.on("SIGINT", function onSigint() {
  logger.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// quit properly on docker stop
process.on("SIGTERM", function onSigterm() {
  logger.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// shut down server
function shutdown() {
  server.close(function onServerClosed(e) {
    if (e) {
      logger.error(e);
      process.exitCode = 1;
    }
    process.exit();
  });
}
