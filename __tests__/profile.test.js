import supertest from "supertest";
import app from "../src/app";

import seedDatabase, { user1, user2, user3 } from "./utils/seedDatabase";
import {
  LIKE_PROFILE,
  LINK_PROFILE,
  SIGNS3,
  UNLINK_PROFILE,
  BLOCK_PROFILE,
  CONVERT_COUPLE,
} from "./utils/queries";
import shutdown from "./utils/shutdown";

const request = supertest(app);

describe("-- Profile Tests --", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  let profileID;

  // it("Should return searched profile", (done) => {
  //   const variables = {
  //     searchType: "",
  //     limit: 5,
  //     skip: 0,
  //     long: -117.1324928,
  //     lat: 32.7581696,
  //     distance: "",
  //     ageRange: "18-50",
  //     interestedIn: ["M", "MF"],
  //     isMobile: false
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: SEARCH_PROFILES,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user3.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.searchProfiles).toBeInstanceOf(Object);
  //       done();
  //     });
  // });

  it("Should like user profile", (done) => {
    const variables = {
      toProfileID: "5f28076b671b92dd673e3d09",
    };

    request
      .post("/graphql")
      .send({
        query: LIKE_PROFILE,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect("Content-Type", /json/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        profileID = res.body.data.likeProfile;
        return done();
      });
  });

  it("Should link profile", (done) => {
    const variables = {
      code: "PPBqWA9",
    };

    request
      .post("/graphql")
      .send({
        query: LINK_PROFILE,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        profileID = res.body.data.linkProfile.profileID;
        expect(res.body.data.linkProfile).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should convert to couples", (done) => {
    const variables = {
      coupleProID: profileID,
    };

    request
      .post("/graphql")
      .send({
        query: CONVERT_COUPLE,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.convertToCouple).toBeNull();
        return done();
      });
  });

  it("Should unlink profile", (done) => {
    request
      .post("/graphql")
      .send({
        query: UNLINK_PROFILE,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.unlinkProfile).toBeTruthy();
        return done();
      });
  });

  it("Should block profile", (done) => {
    const variables = {
      blockedProfileID: "5f28076b671b92dd673e3d09",
    };

    request
      .post("/graphql")
      .send({
        query: BLOCK_PROFILE,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.blockProfile).toBeTruthy();
        return done();
      });
  });

  it("Should sign S3", (done) => {
    const variables = {
      filetype: "",
    };

    request
      .post("/graphql")
      .send({
        query: SIGNS3,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.signS3).toBeInstanceOf(Object);
        return done();
      });
  });
});
