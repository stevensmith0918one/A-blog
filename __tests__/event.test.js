import supertest from "supertest";
import app from "../src/app";
import seedDatabase, { user1, user2, user3 } from "./utils/seedDatabase";
import {
  CREATE_EVENT,
  GET_MY_EVENTS,
  GET_EVENT,
  GET_COMMENTS,
  INVITE_PROFILES_EVENT,
  REMOVE_PROFILES_EVENT,
  TOGGLE_EVENT_ATTEND,
  POST_COMMENT,
} from "./utils/queries";
import shutdown from "./utils/shutdown";

const request = supertest(app);

describe("-- Events Tests --", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  let eventID;
  let chatID;

  it("Should create event", (done) => {
    const variables = {
      address: "3455 Senn Street, San Diego, CA, USA",
      description: "ITS A TEST!!!",
      endTime: "2020-08-08T01:02:00.000Z",
      eventname: "TestEvent",
      image: "",
      interestedIn: ["M", "MF", "F"],
      isImageAlt: false,
      kinks: ["spanking"],
      lat: 32.6848356,
      long: -117.12999,
      startTime: "2020-08-07T01:02:00.000Z",
      tagline: "Im a test",
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

  // it("Should search event", (done) => {
  //   const variables = {
  //     long: -117.12999,
  //     lat: 32.6848356,
  //     maxDistance: 550,
  //     kinks: ["spanking"],
  //     limit: 10,
  //     skip: 0
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: SEARCH_EVENTS,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user1.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.searchEvents).toBeInstanceOf(Object);
  //       done();
  //     });
  // });

  it("Should get an event", (done) => {
    const variables = {
      id: eventID,
    };

    request
      .post("/graphql")
      .send({
        query: GET_EVENT,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        chatID = res.body.data.event.chatID;
        expect(res.body.data.event).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should return event created by me", (done) => {
    request
      .post("/graphql")
      .send({
        query: GET_MY_EVENTS,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getMyEvents).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should toggle an event", (done) => {
    const variables = { eventID };

    request
      .post("/graphql")
      .send({
        query: TOGGLE_EVENT_ATTEND,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.toggleAttendEvent).toBeTruthy();
        return done();
      });
  });

  it("Should invite event profiles", (done) => {
    const variables = {
      eventID,
      invitedProfiles: [user2.profileID],
    };

    request
      .post("/graphql")
      .send({
        query: INVITE_PROFILES_EVENT,
        variables,
      })
      .set("Authorization", `Bearer ${user2.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.inviteProfileEvent).toBeTruthy();
        return done();
      });
  });

  it("Should remove event profiles", (done) => {
    const variables = {
      eventID,
      removedProfiles: [user2.profileID],
    };

    request
      .post("/graphql")
      .send({
        query: REMOVE_PROFILES_EVENT,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.removeProfileEvent).toBeTruthy();
        return done();
      });
  });

  it("Should post a comments", (done) => {
    const variables = {
      chatID,
      text: "demo comments",
    };

    request
      .post("/graphql")
      .send({
        query: POST_COMMENT,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.postComment).toBeTruthy();
        return done();
      });
  });

  // it("Should delete an event", (done) => {
  //   const variables = {
  //     eventID: eventID
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: DELETE_EVENT,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user1.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.deleteEvent).toBeTruthy();
  //       done();
  //     });
  // });

  it("Should return event comments", (done) => {
    const variables = {
      chatID,
      limit: 1,
    };

    request
      .post("/graphql")
      .send({
        query: GET_COMMENTS,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getComments).toBeInstanceOf(Object);
        return done();
      });
  });
});
