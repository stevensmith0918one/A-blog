const config = {
  appVersion: "0.0.01",
  mobileNumberLocale: "en-IN",
  minPasswordLength: 6,
  devicePlatforms: {
    ANDROID: "android",
    IOS: "ios",
  },
  user: {
    status: {
      ACTIVE: "active",
      DISABLED: "disabled",
    },
  },
  flagTypes: {
    Profile: "Profile",
    Chat: "Chat",
    Event: "Event",
    User: "User",
  },
  whitelist: {
    production: ["https://www.foxtailapp.com", "https://foxtailapp.com"],
    other: ["http://localhost:1234", "https://foxtail-stage.netlify.app"],
  },
  validPhoneNumbers: [
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
  ],
  generateOtp: () => Math.floor(1000 + Math.random() * 9000),
};

module.exports = config;
