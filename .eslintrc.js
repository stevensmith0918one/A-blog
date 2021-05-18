module.exports = {
  env: {
    node: true,
    jest: true,
  },
  extends: ["airbnb-base", "eslint:recommended", "prettier"],
  plugins: ["prettier"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": "error",
    "react/display-name": 0,
    "react/prop-types": 0,
    quotes: [
      "error",
      "double",
      { avoidEscape: true, allowTemplateLiterals: false },
    ],
    "no-new": 0,
    "no-underscore-dangle": 0,
    "no-bitwise": 0,
    "no-use-before-define": 0,
    "no-buffer-constructor": 0,
  },
};
