import passport from "passport";
import { graphqlHTTP } from "express-graphql";
import schema from "../graphql";

const User = require("../models/User");

// TODO: Test reject for logout to prevent further calls
export default graphqlHTTP((req, res) => {
  return new Promise((resolve) => {
    const next = (user) => {
      let token = null;
      let refreshToken = null;
      res.set(
        "Access-Control-Expose-Headers",
        "authorization, x-refresh-token,lang"
      );

      if (user) {
        if (
          process.env.NODE_ENV !== "production" ||
          req.rateLimit.limit <= req.rateLimit.current
        ) {
          User.findByIdAndUpdate(user.id, {
            $set: { captchaReq: true, ip: req.ip },
          });
        }

        token = user.tokens.find((q) => q.access === "auth");
        refreshToken = user.tokens.find((q) => q.access === "refresh");
        res.set("authorization", token.token);
        res.set("x-refresh-token", refreshToken.token);
        res.set("lang", user.lang);
      }
      /**
       * GraphQL configuration goes here
       */
      resolve({
        schema,
        graphiql: process.env.NODE_ENV !== "production", // <- only enable GraphiQL in dev
        context: {
          user: user || null,
        },
      });
    };

    /**
     * Try to authenticate using passport,
     * but never block the call from here.
     */
    passport.authenticate("bearer", { session: false }, (err, user) => {
      // if tokens are diff send as info
      next(user);
    })(req, res, next);
  });
});
