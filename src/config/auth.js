exports.isAuthenticated = (context) => {
  const { user } = context;
  if (user) {
    if (user.active) return true;
    if (user.captchaReq) throw new Error("Please complete captcha first.");
    throw new Error("User is not active.");
  }
  throw new Error("User is not logged in (or authenticated).");
};
