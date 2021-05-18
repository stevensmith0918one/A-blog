import supertest from "supertest";
import app from "../src/app";
import seedDatabase, { user1, user2, user3 } from "./utils/seedDatabase";
import { CREATE_EVENT, FLAG_ITEM, GET_FLAG } from "./utils/queries";
import shutdown from "./utils/shutdown";

const request = supertest(app);

describe("-- Flag Tests --", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  let eventID;

  it("Should create event", (done) => {
    const variables = {
      address: "3455 Senn Street, San Diego, CA, USA",
      description: "ITS A TESTING!!!",
      endTime: "2020-07-28T01:02:00.000Z",
      eventname: "TestEventFlag",
      image: "",
      interestedIn: [],
      isImageAlt: false,
      kinks: ["spanking"],
      lat: 32.6848356,
      long: -117.12999,
      startTime: "2020-07-27T01:02:00.000Z",
      tagline: "Im in a test",
      type: "public",
    };

    request
      .post("/graphql")
      .send({
        query: CREATE_EVENT,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect("Content-Type", /json/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        eventID = res.body.data.createEvent.id;
        return done();
      });
  });

  it("Should flag event", (done) => {
    const variables = {
      type: "Event",
      reason: "Bad",
      targetID: eventID,
    };

    request
      .post("/graphql")
      .send({
        query: FLAG_ITEM,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.flagItem).toBeTruthy();
        return done();
      });
  });

  it("Should return flag from event", (done) => {
    const variables = {
      targetID: eventID,
    };

    request
      .post("/graphql")
      .send({
        query: GET_FLAG,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.flag[0].reason).toBe("Bad");
        return done();
      });
  });
});
