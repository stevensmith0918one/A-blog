import * as Sentry from "@sentry/node";

const axios = require("axios");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { login, getByID, confirmPhone, create } = require("./User");
const User = require("../../models/User");
const { clearHash } = require("../../utils/cache");
// @route   POST api/profile
// @desc    Create or edit user profile
// @access  Private
async function getPhone({ csrf, code }) {
  try {
    // CSRF check
    if (csrf === global.secrets.CSRF) {
      const response = await axios.post(global.secrets.TOKEN_EXCHANGE_URL, {
        idToken: code,
      });

      return response.data.users[0].phoneNumber;
    }
    // login failed
    throw new Error(
      "Client: Phone verification failed, please clear your browser cache and try again."
    );
  } catch (e) {
    throw new Error(e.message);
  }
}

async function fbResolve({
  csrf,
  code,
  createData,
  isCouple,
  isCreate,
  password,
}) {
  try {
    let phone;
    // TODO: UNDO STAGING AND SETUP FOR TEST
    if (process.env.NODE_ENV === "stagingTTTT") {
      phone = "1";
    } else {
      phone = await getPhone({ csrf, code });
      if (
        !validator.isIn(phone, [
          "1",
          "2",
          "3",
          "4",
          "5",
          "+16781111111",
          "+16782222222",
          "+16783333333",
          "+16784444444",
          "+16785555555",
        ]) &&
        !validator.isMobilePhone(phone)
      ) {
        throw new Error("Client: Invalid mobile number!");
      }
    }

    if (isCreate) {
      // eslint-disable-next-line no-param-reassign
      createData.phone = phone;
      // eslint-disable-next-line no-param-reassign
      createData.password = password;
      return create(createData, isCouple);
    }

    return login({ phone, password });
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
}

async function fbResetPhone({ csrf, code, token, password }, req) {
  try {
    let user;
    const phone = await getPhone({ csrf, code });
    if (!phone) {
      throw new Error(
        "Client: Reset error has occurred. Please contact support (support@foxtailapp.com)."
      );
    }
    if (token) {
      const { userID } = jwt.verify(token, global.secrets.EMAIL_SECRET);
      if (!userID) {
        throw new Error("Client: User doesn't exist.");
      }

      user = await getByID(userID);
    } else {
      user = req.user;
    }

    if (!user || !user.active) {
      throw new Error("Client: User doesn't exist.");
    }
    if (user.flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }

    if (user.password) {
      const passResult = await user.comparePassword(password);
      if (!passResult) {
        throw new Error("Client: Invalid login information.");
      }
    } else if (password) {
      throw new Error("Client: Invalid login information.");
    }

    // PHONE RECONCILE
    if (!(await confirmPhone({ phone, userID: user.id }))) {
      throw new Error(
        "Client: Reset error has occurred. Please contact support (support@foxtailapp.com)."
      );
    }

    await User.findByIdAndUpdate(user.id, {
      $set: {
        phone,
      },
    });

    return true;
  } catch (e) {
    Sentry.captureException(e);
    if (e.message.includes("expired")) {
      throw new Error("Client: Reset token has expired. Please try again.");
    } else if (e.message.includes("Invalid")) {
      throw new Error(
        "Client: Invalid information entered. Please check and try again."
      );
    }
    throw new Error(
      "Client: Reset error has occurred. Please contact support (support@foxtailapp.com)."
    );
  }
}

async function resetPassword({ token, password, currPassword }, req) {
  try {
    let user;

    if (token) {
      const { userID } = jwt.verify(token, global.secrets.PASS_SECRET);
      if (!userID) {
        return false;
      }
      user = await getByID(userID);
    } else {
      user = req.user;
      if (user.password) {
        const passResult = await user.comparePassword(currPassword);
        if (!passResult) {
          return false;
        }
      } else if (currPassword) {
        return false;
      }
    }

    if (!user || !user.active) {
      return new Error("Client: User does not exist");
    }
    if (user.flagIDs.length >= 3) {
      throw new Error(
        "Client: This account has been flagged for review. Please contact support at support@foxtailapp.com if this is a mistake."
      );
    }

    if (password !== "") {
      // Must do it this way to trigger pre save hashing of password
      user.password = password;
      user.isNew = false;
      await user.save();
      clearHash(user._id);
      return true;
    }
    await User.findByIdAndUpdate(user._id, {
      $unset: {
        password: 1,
      },
    });
    clearHash(user._id);
    return true;
  } catch (e) {
    Sentry.captureException(e);
    if (e.message.includes("expired")) {
      throw new Error("Client: Reset token has expired. Please try again.");
    }
    return new Error(
      "Client: Error Occurred. Please contact support at support@foxtailapp.com"
    );
  }
}

module.exports = {
  fbResolve,
  fbResetPhone,
  resetPassword,
};
