const mongoose = require("mongoose");
const RedisClient = require("../../src/utils/cache").client;

async function shutdown() {
  await new Promise((resolve) => {
    RedisClient.quit(() => {
      resolve();
    });
  });
  // redis.quit() creates a thread to close the connection.
  // We wait until all threads have been run once to ensure the connection closes.
  await mongoose.disconnect();
  await new Promise((resolve) => setImmediate(resolve));
}
export default shutdown;
