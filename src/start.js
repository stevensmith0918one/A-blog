import * as Sentry from "@sentry/node";
import logger from "./config/logger";

/**
 * Application Entry point
 * @type {createApplication}
 */
const secretsUtil = require("./utils/secrets");

secretsUtil
  .getSecrets()
  .then(() => {
    // eslint-disable-next-line global-require
    require("./server");
  })
  .catch((err) => {
    logger.error(err);
    Sentry.captureException(err);
  });
