import logger from "../config/logger";

const Sentry = require("@sentry/node");
const _ = require("lodash");
const moment = require("moment");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const { clearHash } = require("./cache");
const { emailTranslate } = require("./translate");
const User = require("../models/User");

const SES = new AWS.SES();

const skipDev = true;
async function sendNewMsgEMail({
  fromProfileName,
  toProfileName,
  toEmail,
  lang,
}) {
  if (process.env.NODE_ENV === "development" && skipDev) {
    return;
  }
  try {
    const body = `${emailTranslate(
      "You have a new message from",
      lang
    )} ${fromProfileName}. ${emailTranslate(
      "Please login to your Foxtail account to respond.",
      lang
    )} "- Foxtail. www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "New Message on Foxtail",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${toProfileName}, \r\n<br/><p>${emailTranslate(
        "You have a new message from",
        lang
      )} ${fromProfileName}! \r\n<br/>${emailTranslate(
        "Please login to your Foxtail account to respond.",
        lang
      )}</p>` +
      "\r\n<p>" +
      "Foxtail.</p>" +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("You have a New Message on Foxtail!", lang);

    const params = {
      Destination: {
        ToAddresses: [toEmail],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendNewEventInvitation({
  fromProfileName,
  toProfileName,
  toEmail,
  eventName,
  lang,
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = emailTranslate("You have been invited to the event", lang);
    /* ` ${eventName}, ${emailTranslate(
      "by",
      lang
    )} ${fromProfileName}. ${emailTranslate(
      "Please login to your Foxtail account to respond.",
      lang
    )} "- Foxtail. www.foxtailapp.com"`; */

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "New event invitation on Foxtail",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${toProfileName}, \r\n<br/><p>${emailTranslate(
        "You have been invited to the event",
        lang
      )} ${eventName}, ${emailTranslate(
        "by",
        lang
      )} ${fromProfileName}! \r\n<br/>${emailTranslate(
        "Please login to your Foxtail account to respond.",
        lang
      )}</p>` +
      "\r\n<p>" +
      "Foxtail.</p>" +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "You have been invited to an event on Foxtail!",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [toEmail],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendNewChatInvitation({
  fromProfileName,
  toProfileName,
  toEmail,
  lang,
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate(
      "You have been invited to a group chat by",
      lang
    )}, ${fromProfileName}. ${emailTranslate(
      "Please login to your Foxtail account to respond.",
      lang
    )} "Foxtail. - www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "New chat invitation on Foxtail",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${toProfileName}, \r\n<br/><p>${emailTranslate(
        "You have been invited to a group chat by",
        lang
      )}, ${fromProfileName}! \r\n<br/>${emailTranslate(
        "Please login to your Foxtail account to respond.",
        lang
      )}</p>` +
      "\r\n<p>" +
      "Foxtail.</p>" +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";
    const subject = emailTranslate(
      "You have been invited to a group chat on Foxtail!",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [toEmail],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendEmailToProfile({
  profile,
  fromUsername,
  fromUserID,
  eventName,
  isChatInvite,
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const toProfile = profile;
    toProfile.userIDs.forEach(async (userID) => {
      if (_.isEqual(userID, fromUserID)) {
        return;
      }
      const user = await User.findById(userID);
      if (user.notificationRules.emailNotify) {
        const now = moment(new Date()); // todays date
        const end = moment(user.activity.lastEmail); // another date
        const duration = moment.duration(now.diff(end));
        const lastDuration = duration._milliseconds;
        if (!user.online && lastDuration > 300000) {
          if (isChatInvite) {
            await sendNewChatInvitation({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang,
            });
          } else if (eventName) {
            await sendNewEventInvitation({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang,
              eventName,
            });
          } else {
            await sendNewMsgEMail({
              fromProfileName: fromUsername,
              toProfileName: toProfile.profileName,
              toEmail: user.email,
              lang: user.lang,
            });
          }

          await User.findByIdAndUpdate(user._id, {
            $set: {
              "activity.lastEmail": now,
            },
          });
        }
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendVerEMail(toEmail, id) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return true;
    }
    const user = await User.findById(id, {
      lang: 1,
      username: 1,
      "activity.lastEmail": 1,
    }).cache({ key: id });
    const now = moment(new Date()); // todays date
    const end = moment(user.activity.lastEmail); // another date
    const duration = moment.duration(now.diff(end));
    const lastDuration = duration._milliseconds;

    if (lastDuration >= 300000 || _.isUndefined(user.activity.lastEmail)) {
      const { lang } = user;
      jwt.sign(
        {
          userID: id,
          email: toEmail,
        },
        global.secrets.EMAIL_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION,
        },
        (err, emailVer) => {
          const body = `${emailTranslate("Hello", lang)} ${
            user.username
          }, ${emailTranslate(
            "It’s time to confirm your email address! Just go to this link:",
            lang
          )} https://foxtailapp.com/confirmation?token=${emailVer} ${emailTranslate(
            "*Please Note: Confirming your email will deactivate this email for any other account using it on Foxtail.",
            lang
          )} ${emailTranslate(
            "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
            lang
          )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
            "Foxtail Security Team",
            lang
          )} "support@foxtailapp.com"`;

          const htmlBody =
            `<html>\r\n  <head>\r\n    <title>${emailTranslate(
              "Please Verify your Email on Foxtail",
              lang
            )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
              "Hello",
              lang
            )} ${user.username}, \r\n<br/><p>${emailTranslate(
              "It’s time to confirm your email address! Just go to this link:",
              lang
            )}</p><a href="https://foxtailapp.com/confirmation?token=${emailVer}">https://foxtailapp.com/confirmation?token=${emailVer}</a><br/><p>${emailTranslate(
              "*Please Note: Confirming your email will deactivate this email for any other account using it on Foxtail.",
              lang
            )}</p>${emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            )}<p>${emailTranslate("Thanks", lang)}<br/>${emailTranslate(
              "Foxtail Security Team",
              lang
            )}<br/>` +
            "support@foxtailapp.com" +
            "</p>" +
            "</body>\r\n</html>";

          const subject = emailTranslate(
            "Please Verify your Email on Foxtail",
            lang
          );

          const params = {
            Destination: {
              ToAddresses: [toEmail],
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody,
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body,
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject,
              },
            },
          };
          SES.sendEmail(params, async (err2) => {
            if (err2) {
              Sentry.captureException(err2);
            }
            await User.findByIdAndUpdate(user._id, {
              $set: {
                "activity.lastEmail": now,
              },
            });
            clearHash(id);
          });
        }
      );
      return true;
    }
    return false;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

async function newPhoneAcct({ username, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello")} ${username}, ${emailTranslate(
      "The phone number associated with your profile has been used to register a new profile. Therefore, your current account has been deactivated and will be deleted soon.",
      lang
    )} ${emailTranslate(
      "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
      lang
    )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
      "Foxtail Security Team",
      lang
    )} "support@foxtailapp.com"`;
    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Old Account Deactivated",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${username}, \r\n<br/><p>${emailTranslate(
        "The phone number associated with your profile has been used to register a new profile. Therefore, your current account has been deactivated and will be deleted soon.",
        lang
      )}</p>${emailTranslate(
        "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
        lang
      )}<p>${emailTranslate("Thanks", lang)}<br/>${emailTranslate(
        "Foxtail Security Team",
        lang
      )}<br/>` +
      "support@foxtailapp.com" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Old Account Deactivated", lang);

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendPhoneReset({ email, id, username, lang }) {
  let sent = false;
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return "";
    }
    sent = await new Promise((res) =>
      jwt.sign(
        {
          userID: id,
        },
        global.secrets.EMAIL_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION,
        },
        async (err, emailVer) => {
          const body = `${emailTranslate(
            "Hello",
            lang
          )} ${username}, ${emailTranslate(
            "We've received a phone login reset for your account. If you're trying to change the phone login to your Foxtail account, just go to this link and click 'Reset Phone' on the popup:",
            lang
          )} https://foxtailapp.com/phonereset?token=${emailVer} ${emailTranslate(
            "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
            lang
          )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
            "Foxtail Security Team",
            lang
          )} "support@foxtailapp.com"`;

          const htmlBody =
            `<html>\r\n  <head>\r\n    <title>${emailTranslate(
              "Phone Login Reset Request",
              lang
            )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
              "Hello",
              lang
            )} ${username}, \r\n<br/><p>${emailTranslate(
              "We've received a phone login reset for your account. If you're trying to change the phone login to your Foxtail account, just go to this link and click 'Reset Phone' on the popup:",
              lang
            )}<br/><br/>` +
            `https://foxtailapp.com/phonereset?token=${emailVer}</p>${emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            )}<p>${emailTranslate("Thanks", lang)}<br/>${emailTranslate(
              "Foxtail Security Team",
              lang
            )}<br/>` +
            "support@foxtailapp.com" +
            "</body>\r\n</html>";

          const subject = emailTranslate("Phone Login Reset Request", lang);

          const params = {
            Destination: {
              ToAddresses: [email],
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody,
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body,
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject,
              },
            },
          };

          SES.sendEmail(params, (err2) => {
            if (err2) {
              logger.info("Error sending email", err2);
              Sentry.captureException(err2);
              res(false);
            } else {
              res(true);
            }
          });
        }
      )
    );
    return sent;
  } catch (e) {
    Sentry.captureException(e);
  }
  return "";
}

async function sendPasswordReset({ email, id, username, lang }) {
  let sent = false;
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return "";
    }
    sent = await new Promise((res) =>
      jwt.sign(
        {
          userID: id,
        },
        global.secrets.PASS_SECRET,
        {
          expiresIn: global.secrets.RESET_SECRET_EXPIRATION,
        },
        async (err, emailVer) => {
          const body = `${emailTranslate(
            "Hello",
            lang
          )} ${username}, ${emailTranslate(
            "We've received a password reset for your account. If you're trying to change the password to your Foxtail account, just go to this link",
            lang
          )}: https://foxtailapp.com/passReset?token=${emailVer} ${emailTranslate(
            "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
            lang
          )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
            "Foxtail Security Team",
            lang
          )} "support@foxtailapp.com"`;

          const htmlBody =
            `<html>\r\n  <head>\r\n    <title>${emailTranslate(
              "Phone Login Reset Request",
              lang
            )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
              "Hello",
              lang
            )} ${username}, \r\n<br/><p>${emailTranslate(
              "We've received a password reset for your account. If you're trying to change the password to your Foxtail account, just go to this link:",
              lang
            )}<br/><br/>` +
            `https://foxtailapp.com/passReset?token=${emailVer}</p>${emailTranslate(
              "If you don’t know why you got this email, please tell us straight away so we can fix this for you.",
              lang
            )}<p>${emailTranslate("Thanks", lang)}<br/>${emailTranslate(
              "Foxtail Security Team",
              lang
            )}<br/>` +
            "support@foxtailapp.com" +
            "</body>\r\n</html>";

          const subject = emailTranslate("Password Reset Request", lang);

          const params = {
            Destination: {
              ToAddresses: [email],
            },
            Source: "Foxtail <noreply@foxtailapp.com>",
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody,
                },
                Text: {
                  Charset: "UTF-8",
                  Data: body,
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: subject,
              },
            },
          };

          SES.sendEmail(params, (err2) => {
            if (err2) {
              Sentry.captureException(err2);
              logger.info("Error sending email", err2);
              res(false);
            } else {
              res(true);
            }
          });
        }
      )
    );

    return sent;
  } catch (e) {
    Sentry.captureException(e);
  }
  return "";
}

async function emailEventReminders({ users, eventName, eventDate, eventID }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const usersByLang = _.groupBy(users, "lang");

    Object.keys(usersByLang).forEach((lang) => {
      const users2 = usersByLang[lang];
      const emails = users2.map((user) => user.email);

      const body =
        `${emailTranslate("Hello", lang)}, ${emailTranslate(
          "An event you're planning to attend is happening tomorrow at",
          lang
        )}: ${eventDate}.${emailTranslate(
          "Please take a look at the event page for location and updates",
          lang
        )}: ` +
        `https://www.foxtailapp.com/event/${eventID} ${emailTranslate(
          "If your plans have changed please update your attendance on the event.",
          lang
        )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
          "Foxtail",
          lang
        )} ` +
        "www.foxtailapp.com";

      const htmlBody =
        `<html>\r\n  <head>\r\n    <title>${emailTranslate(
          "Upcoming Event Reminder",
          lang
        )}: ${eventName}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
          "Hello",
          lang
        )}, \r\n<br/><p>${eventName} ${emailTranslate(
          "is happening tomorrow,",
          lang
        )} ${eventDate}.<br/><br/>${emailTranslate(
          "Please take a look at the event page for location and updates:",
          lang
        )}<br/>` +
        `https://www.foxtailapp.com/event/${eventID}<br/><br/>${emailTranslate(
          "If your plans have changed please update your attendance on the event.",
          lang
        )}</p>` +
        "Foxtail." +
        "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
        "</body>\r\n</html>";

      const subject = `${emailTranslate(
        "Upcoming Event Reminder",
        lang
      )}: ${eventName}`;

      const params = {
        Destination: {
          BccAddresses: emails,
        },
        Source: "Foxtail <noreply@foxtailapp.com>",
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: htmlBody,
            },
            Text: {
              Charset: "UTF-8",
              Data: body,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject,
          },
        },
      };

      SES.sendEmail(params, (err) => {
        if (err) {
          Sentry.captureException(err);
          logger.info("Error sending email", err);
        }
      });
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function emailEventCancellations({ users, eventName, eventDate }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const usersByLang = _.groupBy(users, "lang");
    Object.keys(usersByLang).forEach((lang) => {
      const users2 = usersByLang[lang];
      const emails = users2.map((user) => user.email);

      const body = `${emailTranslate(
        "Hello",
        lang
      )}, ${eventName}${emailTranslate(
        "was happening at",
        lang
      )}${eventDate}, ${emailTranslate(
        "but has been canceled by its creator.",
        lang
      )} ${emailTranslate("Thanks", lang)}, ${emailTranslate(
        "Foxtail",
        lang
      )} "www.foxtailapp.com";`;

      const htmlBody =
        `<html>\r\n  <head>\r\n    <title>${emailTranslate(
          "Event Canceled:",
          lang
        )} ${eventName}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
          "Hello",
          lang
        )}, \r\n<br/><p>${eventName} ${emailTranslate(
          "was happening at",
          lang
        )} ${eventDate}, ${emailTranslate(
          "but has been canceled by its creator.",
          lang
        )}</p>` +
        "Foxtail." +
        "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
        "</body>\r\n</html>";

      const subject = `${emailTranslate("Event Canceled", lang)}: ${eventName}`;

      const params = {
        Destination: {
          BccAddresses: emails,
        },
        Source: "Foxtail <noreply@foxtailapp.com>",
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: htmlBody,
            },
            Text: {
              Charset: "UTF-8",
              Data: body,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: subject,
          },
        },
      };

      SES.sendEmail(params, (err) => {
        if (err) {
          Sentry.captureException(err);
          logger.info("Error sending email", err);
        }
      });
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function emailDailyUpdates({ email, likesCount, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate(
      "Hello",
      lang
    )} ${userName}, ${emailTranslate(
      "Your profile has been liked by",
      lang
    )} ${likesCount} ${emailTranslate(
      "members today. Don't leave them waiting.",
      lang
    )} - ${emailTranslate("Foxtail", lang)} "www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${userName} ${emailTranslate(
        "you got new likes today!",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${userName},<br/><p>${emailTranslate(
        "Your profile has been liked by",
        lang
      )} ${likesCount} ${emailTranslate(
        "members today. Don't leave them waiting.",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = `${userName} ${emailTranslate(
      "you got new likes today!",
      lang
    )}`;

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function emailAccountOld({ email, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${userName}${+emailTranslate(
      "Your account is due to be erased soon. Login now, to show us you're still with us. ",
      lang
    )} "- Foxtail. https://www.foxtailapp.com/"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Foxtail Account will be Erased Soon.",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${userName},<br/><p>${emailTranslate(
        "Your account is due to be erased soon. Login now, to show us you're still with us.",
        lang
      )}<br/> ` +
      "</p>" +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = `${userName}, ${emailTranslate(
      "where have you been? Your account is due to be erased soon.",
      lang
    )}`;

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function emailDeleted({ email, userName, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${userName}${+emailTranslate(
      "Your profile has been deleted from Foxtail. If you have a moment, please let us know if there is anything we can do to improve at support@foxtailapp.com.",
      lang
    )}- Foxtail. www.foxtailapp.com`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Your Foxtail Account has been Deleted.",
        lang
      )}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${userName},<br/><p>${emailTranslate(
        "Your profile has been deleted from Foxtail. If you have a moment, please let us know if there is anything we can do to improve at support@foxtailapp.com.",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = `${userName}, ${emailTranslate(
      "Your Foxtail Account has been Deleted.",
      lang
    )}`;

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendEmailToAdmin({
  name,
  email,
  text,
  type,
  user,
  profilePic,
  image,
}) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }

    let subject;
    if (type === "deleted") {
      subject = "Deleted User Mail";
    } else if (type === "verify") {
      subject = "User Verification";
      // eslint-disable-next-line no-param-reassign
      text = `Profile:${profilePic} Verification:${image}`;
    } else if (user) {
      subject = "User Mail";
    } else {
      subject = "Guest Mail";
    }

    const body = `Name: ${name}<br/> Email: ${email}<br/>Details: ${text}`;
    const params = {
      Destination: {
        ToAddresses: ["support@foxtailapp.com"],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendBonusEmailToUser({ name, email, renewal, today, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate(
      "Congratulations",
      lang
    )} ${name}. ${today} ${emailTranslate(
      "member(s) joined Foxtail using your referral code.",
      lang
    )} ${emailTranslate("We've added", lang)} ${today} ${emailTranslate(
      "week(s) to your Black Membership.",
      lang
    )} ${emailTranslate(
      "Your new renewal/ending date is:",
      lang
    )} ${renewal}. ${emailTranslate(
      "We will add more weeks the more you share Foxtail. www.foxtailapp.com",
      lang
    )} ${emailTranslate("Thanks for sharing!", lang)}`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Congratulations",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Congratulations",
        lang
      )} ${name}! <p>${today} ${emailTranslate(
        "member(s) joined Foxtail using your referral code.",
        lang
      )}<br/><br/>${emailTranslate(
        "We've added",
        lang
      )} ${today} ${emailTranslate(
        "week(s) to your Black Membership.",
        lang
      )}<br/>${emailTranslate(
        "Your new renewal/ending date is:",
        lang
      )} ${renewal}. <br/><br/>${emailTranslate(
        "We will add more weeks the more you share Foxtail.",
        lang
      )}<br/><br/>${emailTranslate("Thanks for sharing!", lang)}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Black Membership Referral Bonus Activated",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendBlkBonusActiveToUser({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body =
      `${emailTranslate("Congratulations", lang)} ${name}, ${emailTranslate(
        "We've added 1 week of Black Membership to your profile.",
        lang
      )} ${emailTranslate(
        "After a week, the membership will cancel automatically unless you add more weeks by inviting more people.",
        lang
      )} ${emailTranslate(
        "Feel free to share as much as you like, there is no limit to the number of free weeks we will add to your account.",
        lang
      )} ${emailTranslate("Thanks for sharing!", lang)} ` +
      "- Foxtail. https://www.foxtailapp.com";

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Black Membership Bonus Activated",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Congratulations",
        lang
      )} ${name}, <p>${emailTranslate(
        "We've added 1 week of Black Membership to your profile.",
        lang
      )}<br/><br/>${emailTranslate(
        "After a week, the membership will cancel automatically unless you add more weeks by inviting more people.",
        lang
      )}<br/><br/>${emailTranslate(
        "Feel free to share as much as you like, there is no limit to the number of free weeks we will add to your account.",
        lang
      )}<br/><br/>${emailTranslate("Thanks for sharing!", lang)}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Black Membership Bonus Activated", lang);

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendBlkCancelToUser({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "Your Black Membership has been successfully canceled; you won't be charged any further.",
      lang
    )} ${emailTranslate(
      "Please note: The photo limit on free accounts is 4, we've removed any photos over this limit.",
      lang
    )} ${emailTranslate(
      "If you have any suggestions to improve Foxtail or Black Membership, please let us know at support@foxtailapp.com.",
      lang
    )} ${emailTranslate(
      "Thanks for being the best part of Foxtail!",
      lang
    )} "- Foxtail. https://www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Black Membership Canceled Successfully",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${name} <p>${emailTranslate(
        "Your Black Membership has been successfully canceled; you won't be charged any further.",
        lang
      )}<br/>${emailTranslate(
        "Please note: The photo limit on free accounts is 4, we've removed any photos over this limit.",
        lang
      )}<br/><br/>${emailTranslate(
        "If you have any suggestions to improve Foxtail or Black Membership, please let us know at support@foxtailapp.com.",
        lang
      )}<br/>${emailTranslate(
        "Thanks for being the best part of Foxtail!",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Black Membership Canceled Successfully",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendCoupleLink({ name, email, lang, theirName }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "Congratulations! Your Couple's Profile with",
      lang
    )} ${theirName} ${emailTranslate(
      "has been created. Please complete your new profile together.",
      lang
    )} ${emailTranslate(
      "Thanks for being the best part of Foxtail!",
      lang
    )} "- Foxtail. www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Couple's Profile Created Successfully",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${name} <p>${emailTranslate(
        "Congratulations! Your Couple's Profile with",
        lang
      )} ${theirName} ${emailTranslate(
        "has been created. Please complete your new profile together.",
        lang
      )}<br/><br/>${emailTranslate(
        "Thanks for being the best part of Foxtail!",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Couple's Profile Created", lang);

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

async function sendCoupleUnLink({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "Your Couple's Profile has been removed. Please update your original profile on the settings page.",
      lang
    )} ${emailTranslate(
      "Thanks for being the best part of Foxtail!",
      lang
    )} "- Foxtail. https://www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Couple's Profile Removed Successfully",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${name} <p>${emailTranslate(
        "Your Couple's Profile has been removed. Please update your original profile on the settings page.",
        lang
      )}<br/><br/>${emailTranslate(
        "Thanks for being the best part of Foxtail!",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Couple's Profile Removed", lang);

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

function sendWelcome({ name, email, id, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return false;
    }
    jwt.sign(
      {
        userID: id,
        email,
      },
      global.secrets.EMAIL_SECRET,
      {
        expiresIn: global.secrets.RESET_SECRET_EXPIRATION,
      },
      (err, emailVer) => {
        const body =
          `${emailTranslate(
            "Welcome to Foxtail + Email Verification",
            lang
          )} ${name}, ${emailTranslate(
            "Your profile has been created but it’s not finished yet, please login to fill it out.",
            lang
          )} ${emailTranslate(
            "When filling out your profile keep in mind “Honesty is Sexy.” Foxtail is a non-judgmental social network for the likeminded and curious to find each other, there’s no reason to be shy.",
            lang
          )} ${emailTranslate(
            "If you’re a couple, you’ll find the “Create Couple’s Profile” to the left of the My Account page. Copy the code displayed then send it to your partner. Once they create an account, they will be able to use this code to create a new Couple’s Profile which will be fully accessible to you both.",
            lang
          )} ${emailTranslate(
            "Feel free to invite any curious friends or acquaintances who might be interested in joining our community. You will receive a free week of our Premium Black membership for EACH friend you refer to Foxtail. To get credit, use links within the app (sharing your profile, others, or the site itself).",
            lang
          )} ${emailTranslate(
            "It’s time to confirm your email address! Just go to this link:",
            lang
          )} https://foxtailapp.com/confirmation?token=${emailVer} ${emailTranslate(
            "Enjoy!",
            lang
          )} ` +
          "Foxtail. https://www.foxtailapp.com" +
          ` ${emailTranslate("-Stray Together-", lang)}`;

        const htmlBody =
          `<html>\r\n  <head>\r\n    <title>${emailTranslate(
            "Welcome to Foxtail + Email Verification",
            lang
          )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
            "Welcome to Foxtail + Email Verification",
            lang
          )} ${name}, <p>${emailTranslate(
            "Your profile has been created but it’s not finished yet, please login to fill it out. ",
            lang
          )} ${emailTranslate(
            "When filling out your profile keep in mind “Honesty is Sexy.” Foxtail is a non-judgmental social network for the likeminded and curious to find each other, there’s no reason to be shy.",
            lang
          )}<br/><br/>${emailTranslate(
            "If you’re a couple, you’ll find the “Create Couple’s Profile” to the left of the My Account page. Copy the code displayed then send it to your partner. Once they create an account, they will be able to use this code to create a new Couple’s Profile which will be fully accessible to you both.",
            lang
          )}<br/><br/>${emailTranslate(
            "Feel free to invite any curious friends or acquaintances who might be interested in joining our community. You will receive a free week of our Premium Black membership for EACH friend you refer to Foxtail. To get credit, use links within the app (sharing your profile, others, or the site itself).",
            lang
          )}<br/><br/><hr/>${emailTranslate(
            "It’s time to confirm your email address! Just go to this link:",
            lang
          )}<br/><a href="https://foxtailapp.com/confirmation?token=${emailVer}">https://foxtailapp.com/confirmation?token=${emailVer}</a><br/><br/><hr/><br/><br/>${emailTranslate(
            "Enjoy!",
            lang
          )}</p>` +
          "Foxtail." +
          "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
          `<br/><br/>${emailTranslate(
            "-Stray Together-",
            lang
          )}</body>\r\n</html>`;

        const subject = emailTranslate(
          "Welcome to Foxtail + Email Verification",
          lang
        );

        const params = {
          Destination: {
            ToAddresses: [email],
          },
          Source: "Foxtail <noreply@foxtailapp.com>",
          Message: {
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: htmlBody,
              },
              Text: {
                Charset: "UTF-8",
                Data: body,
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: subject,
            },
          },
        };

        SES.sendEmail(params, (err2) => {
          if (err2) {
            Sentry.captureException(err2);
            logger.info("Error sending email", err2);
          }
        });
      }
    );
    return true;
  } catch (e) {
    Sentry.captureException(e);
  }
  return false;
}

async function sendEmailToFinishProfile({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "We noticed you haven't finished filling out your profile.",
      lang
    )} ${emailTranslate(
      "All you need is 1 Photo, 1 Profile Pic, 1 Kink, and 1 Bio. That's it!",
      lang
    )} ${emailTranslate(
      "If you need help, please let us know.",
      lang
    )} ${emailTranslate(
      "Thanks for being the best part of Foxtail!",
      lang
    )} "- Foxtail. https://www.foxtailapp.com"`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Please Complete Your Profile",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${name} <p>${emailTranslate(
        "We noticed you haven't finished filling out your profile.",
        lang
      )}<br/><br/>${emailTranslate(
        "All you need is 1 Photo, 1 Profile Pic, 1 Kink, and 1 Bio. That's it!",
        lang
      )}<br/><br/>${emailTranslate(
        "If you need help, please let us know.",
        lang
      )}<br/><br/>${emailTranslate(
        "Thanks for being the best part of Foxtail!",
        lang
      )}</p>` +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate("Please Complete Your Profile", lang);

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

function sendPromo({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "During this crisis, we want to help keep our members connected even though we are apart.",
      lang
    )} ${emailTranslate(
      "We are giving everyone Free Black Membership until April!",
      lang
    )} ${emailTranslate(
      "With Black Membership, you can  up to 5 members daily, send unlimited likes and more.",
      lang
    )} ${emailTranslate(
      "Stay Sexy, Stay Safe",
      lang
    )} - Foxtail.(https://www.foxtailapp.com) #StrayTogether`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Foxtail Free Black Membership until April - COVID-19 Relief",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n` +
      "Hello" +
      ` ${name}, <p>${emailTranslate(
        "During this crisis, we want to help keep our members connected even though we are apart.",
        lang
      )}<br/><br/>${emailTranslate(
        "We are giving everyone Free Black Membership until April!",
        lang
      )}<br/><br/>${emailTranslate(
        "With Black Membership, you can message up to 5 members daily, send unlimited likes and more.",
        lang
      )}<br/><br/>` +
      "Stay Sexy, Stay Safe" +
      "<br/><br/>" +
      "#StrayTogether" +
      "</p>" +
      "Foxtail." +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Foxtail Free Black Membership until April - COVID-19 Relief",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

function sendCoupleInstructions({ name, email, lang }) {
  try {
    if (process.env.NODE_ENV === "development" && skipDev) {
      return;
    }
    const body = `${emailTranslate("Hello", lang)} ${name}, ${emailTranslate(
      "Creating a Couple’s Profile gives you and your partner a shared profile where all communications can be seen by both of you.",
      lang
    )}${emailTranslate(
      "Making a Couple’s Profile is easy:",
      lang
    )} ${emailTranslate(
      "1.	Go to the My Account page and click “Create Couple’s Profile” in the menu.",
      lang
    )} ${emailTranslate(
      "2.	In the Couple's Profile pop, click the Couple’s Code to copy the code to your clipboard",
      lang
    )} ${emailTranslate(
      "3.	Send the code to your partner.",
      lang
    )} ${emailTranslate(
      "4.	Your partner will need to go to the same Couple’s Profile popup to enter that code. Then press Submit.",
      lang
    )} ${emailTranslate(
      "You’ll be notified once your partner has confirmed your profile. Your profile will be activated when you click the confirmation message.",
      lang
    )} ${emailTranslate(
      "Let us know if you have any issues.",
      lang
    )} ${emailTranslate(
      "Thanks,",
      lang
    )}#StrayTogether - Foxtail. www.foxtailapp.com`;

    const htmlBody =
      `<html>\r\n  <head>\r\n    <title>${emailTranslate(
        "Foxtail - How to Make a Couple's Profile",
        lang
      )} ${name}</title>\r\n  </head>\r\n  <body>\r\n${emailTranslate(
        "Hello",
        lang
      )} ${name}, <p>${emailTranslate(
        "Creating a Couple’s Profile gives you and your partner a shared profile where all communications can be seen by both of you.",
        lang
      )}<br/><br/> ${emailTranslate(
        "Making a Couple’s Profile is easy:",
        lang
      )}<br/>${emailTranslate(
        "1.	Go to the My Account page and click “Create Couple’s Profile” in the menu.",
        lang
      )}<br/>${emailTranslate(
        "2.	In the Couple's Profile pop, click the Couple’s Code to copy the code to your clipboard.",
        lang
      )}<br/>${emailTranslate(
        "3.	Send the code to your partner.",
        lang
      )}<br/>${emailTranslate(
        "4.	Your partner will need to go to the same Couple’s Profile popup to enter that code. Then press Submit.",
        lang
      )}<br/><br/>${emailTranslate(
        "You’ll be notified once your partner has confirmed your profile. Your profile will be activated when you click the confirmation message.",
        lang
      )}<br/><br/>${emailTranslate(
        "Let us know if you have any issues.",
        lang
      )}<br/><br/>${emailTranslate("Thanks,", lang)}</p>` +
      "Foxtail.<br/> #StrayTogether" +
      "<br/><a href='https://www.foxtailapp.com'>https://www.foxtailapp.com</a>" +
      "</body>\r\n</html>";

    const subject = emailTranslate(
      "Foxtail - How to Make a Couple's Profile",
      lang
    );

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Source: "Foxtail <noreply@foxtailapp.com>",
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
          Text: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    SES.sendEmail(params, (err) => {
      if (err) {
        Sentry.captureException(err);
        logger.info("Error sending email", err);
      }
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

module.exports = {
  sendEmailToProfile,
  sendVerEMail,
  newPhoneAcct,
  sendPhoneReset,
  emailEventReminders,
  emailDailyUpdates,
  emailAccountOld,
  sendEmailToAdmin,
  sendBonusEmailToUser,
  sendBlkCancelToUser,
  sendBlkBonusActiveToUser,
  sendCoupleUnLink,
  sendCoupleLink,
  sendPasswordReset,
  emailEventCancellations,
  emailDeleted,
  sendWelcome,
  sendEmailToFinishProfile,
  sendPromo,
  sendCoupleInstructions,
};
