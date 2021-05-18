import mongoose from "mongoose";
import logger from "./config/logger";

// eslint-disable-next-line consistent-return
async function connect() {
  try {
    mongoose.connection.on("connected", function f() {
      logger.info(`Mongoose connected on: ${global.secrets.MONGOHOST}`);
    });

    const connection = await mongoose.connect(global.secrets.MONGOHOST, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    return connection;
  } catch (err) {
    logger.error("Error connecting to mongodb");
    logger.error(err);
  }
}

module.exports = { connect };
