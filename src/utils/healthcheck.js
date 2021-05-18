import logger from "../config/logger";

const http = require("http");

const options = {
  timeout: 2000,
  host: "localhost",
  port: global.secrets.PORT || 80,
  path: "/healthz", // must be the same as HEALTHCHECK in Dockerfile
};

const request = http.request(options, (res) => {
  logger.info(`STATUS: ${res.statusCode}`);
  process.exitCode = res.statusCode === 200 ? 0 : 1;
  process.exit();
});

request.on("error", function f(err) {
  logger.error("ERROR", err);
  process.exit(1);
});

request.end();
