/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const emailTranslate = function f(term, lang) {
  // eslint-disable-next-line no-param-reassign
  lang = lang || "en";
  const jsonData = require(`../locales/${lang}/emails.json`);
  if (!term) return "";

  if (jsonData[term]) return jsonData[term];

  return term;
};

module.exports = { emailTranslate };
