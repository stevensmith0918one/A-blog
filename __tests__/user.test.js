import supertest from "supertest";
import app from "../src/app";
import seedDatabase, { user2, user3 } from "./utils/seedDatabase";
import {
  GET_CURRENT_USER,
  GET_SEARCH_SETTINGS,
  GET_COUNTS,
  UPDATE_SETTINGS,
  SUBMIT_PHOTO,
  RESET_PASSWORD,
  CANCEL_SUBSCRIPTION,
  SEEN_TOUR,
  SEND_PASSWORD_RESET_EMAIL,
} from "./utils/queries";
import shutdown from "./utils/shutdown";

const request = supertest(app);

describe("-- User Tests --", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  // it("Should create user", (done) => {
  //   const variables = {
  //     csrf: "889jhbjhnjk062e4rrt7y8798908b4e821",
  //     code: "567897",
  //     isCreate: true,
  //     email: "jdhfdhdssf45@gmail.com",
  //     password: "BingBong1047",
  //     username: "USER6",
  //     lang: "en",
  //     dob: "10/10/1989",
  //     sex: "M",
  //     interestedIn: ["F"],
  //     ref: "",
  //     cid: "",
  //     isCouple: false
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: FB_RESOLVE,
  //       variables
  //     })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.fbResolve).toBeInstanceOf(Array);
  //       done();
  //     });
  // });

  it("Should get user", (done) => {
    request
      .post("/graphql")
      .send({
        query: GET_CURRENT_USER,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.currentuser).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should return count", (done) => {
    request
      .post("/graphql")
      .send({
        query: GET_COUNTS,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getCounts).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should send password reset email", (done) => {
    const variables = {
      phone: "2",
      email: "cecilcjcarter@gmail.com",
    };

    request
      .post("/graphql")
      .send({
        query: SEND_PASSWORD_RESET_EMAIL,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.sendPasswordResetEmail).toBeTruthy();
        return done();
      });
  });

  /* NEED RESET EMAIL TOKEN HERE */

  /* it("Should confirm users email", (done) => {
    const variables = {
      token: user4.token
    };

    request
      .post('/graphql')
      .send({
        query: CONFIRM_EMAIL,
        variables
      })
      .set('Authorization', `Bearer ${user4.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.confirmEmail).toBeTruthy();
        done();
      });
  }); */

  it("Should upload user photos", (done) => {
    const variables = {
      type: "jpg",
      image: "imgs/test.jpg",
    };

    request
      .post("/graphql")
      .send({
        query: SUBMIT_PHOTO,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.submitPhoto).toBeTruthy();
        return done();
      });
  });

  it("Should get user search setting", (done) => {
    request
      .post("/graphql")
      .send({
        query: GET_SEARCH_SETTINGS,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getSettings).toBeTruthy();
        return done();
      });
  });

  // it("Should get notifications", (done) => {
  //   const variables = {
  //     limit: 1
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: GET_NOTIFICATIONS,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user2.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.getNotifications).toBeTruthy();
  //       done();
  //     });
  // });

  it("Should update user settings", (done) => {
    const variables = {
      distance: 100,
      //   distanceMetric: "",
      //   profilePic: "imgs/test.jpg",
      //   ageRange: [20, 40],
      //   lang: "en",
      //   interestedIn: ["M", "MF", "F"],
      //   city: "California",
      //   country: "US",
      //   lat: 32.7581696,
      //   long: -117.1324928,
      //   email: "cecilcjcarter@gmail.com",
      //   username: "USER2",
      //   sex: "N",
      //   sexuality: ["he", "ho", "bi"],
      //   visible: true,
      //   newMsgNotify: true,
      //   emailNotify: true,
      //   showOnline: true,
      //   likedOnly: true,
      //   vibrateNotify: true,
      //   kinks: ["cuddling"],
      //   about: "testing",
      //   publicPhotoList: [],
      //   privatePhotoList: [],
      //   includeMsgs: false,
    };

    request
      .post("/graphql")
      .send({
        query: UPDATE_SETTINGS,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.updateSettings).toBeFalsy();
        return done();
      });
  });

  it("Should reset users password", (done) => {
    const variables = {
      password: "PASS1047",
      token: user2.token,
      currPassword: "PASS908",
    };

    request
      .post("/graphql")
      .send({
        query: RESET_PASSWORD,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.resetPassword).toBeNull();
        return done();
      });
  });

  // it("Should reset user fb phone", (done) => {
  //   const variables = {
  //     csrf: "889jhbjhnjk062e4rrt7y8798908b4e821",
  //     code: "123456",
  //     token: user2.token,
  //     password: "PASS908"
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: FB_RESET_PHONE,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user2.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.fbResetPhone).toBeTruthy();
  //       done();
  //     });
  // });

  // it("Should create users subscription", (done) => {
  //   const variables = {
  //     ccnum: "4444444444444444",
  //     exp: "04/2024",
  //     cvc: "654",
  //     fname: "John",
  //     lname: "Wick"
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: CREATE_SUBSCRIPTION,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user2.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.createSubcription).toBeTruthy();
  //       done();
  //     });
  // });

  it("Should cancel user subscriptions", (done) => {
    request
      .post("/graphql")
      .send({
        query: CANCEL_SUBSCRIPTION,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.cancelSubcription).toBeTruthy();
        return done();
      });
  });

  // it("Should read notifications", (done) => {
  //   const variables = {
  //     isMobile: true
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: READ_NOTIFICATION,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user2.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.readNotification).toBeTruthy();
  //       done();
  //     });
  // });

  it("Should show seen tour", (done) => {
    const variables = {
      tour: "",
    };

    request
      .post("/graphql")
      .send({
        query: SEEN_TOUR,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.seenTour).toBeTruthy();
        return done();
      });
  });
});
