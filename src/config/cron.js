import logger from "./logger";

const { CronJob } = require("cron");
const {
  sendDailyUpdates,
  offlineCheck,
} = require("../graphql/resolvers/Profile");
const {
  sendEventReminders,
  deleteOldEvents,
} = require("../graphql/resolvers/Event");
const { cleanOldFlags } = require("../graphql/resolvers/Flag");
const {
  canceledMemberships,
  removeOldAccounts,
  remindToFinishProfile,
  referralUpdates,
} = require("../graphql/resolvers/User");

function getDate() {
  const d = new Date();
  return d.toString();
}
/**
 * Every minutes
 */
new CronJob(
  "55 11-23/2 * * *",
  async function cron() {
    logger.info(`Cron job: sendEventReminders ran @ ${getDate()}`);
    await sendEventReminders();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "8 * * * *",
  async function cron() {
    logger.info(`Cron job: deleteOldEvents ran @ ${getDate()}`);
    await deleteOldEvents();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "15 11-23/2 * * *",
  async function cron() {
    logger.info(`Cron job: sendDailyUpdates ran @ ${getDate()}`);
    await sendDailyUpdates();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "30 * * * *",
  async function cron() {
    logger.info(`Cron job: offlineCheck ran @ ${getDate()}`);
    await offlineCheck();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "1 */12 * * *",
  async function cron() {
    logger.info(`Cron job: cleanOldFlags ran @ ${getDate()}`);
    await cleanOldFlags();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "5 */6 * * *",
  async function cron() {
    logger.info(`Cron job: canceledMemberships ran @ ${getDate()}`);
    await canceledMemberships();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "40 */12 * * *",
  async function cron() {
    logger.info(`Cron job: removeOldAccounts ran @ ${getDate()}`);
    await removeOldAccounts();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "0 19 * * *",
  async function cron() {
    logger.info(`Cron job: remindToFinishProfile ran @ ${getDate()}`);
    await remindToFinishProfile();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "30 18 * * *",
  async function cron() {
    logger.info(`Cron job: referralUpdates ran @ ${getDate()}`);
    await referralUpdates();
  },
  null,
  true,
  "America/Los_Angeles"
);
