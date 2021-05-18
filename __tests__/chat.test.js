import supertest from "supertest";
import app from "../src/app";
import seedDatabase, { user1, user2, user3 } from "./utils/seedDatabase";
import {
  GET_CHATPAGE,
  GET_MESSAGES,
  GET_FRIENDS,
  SEND_MESSAGE,
  REMOVE_SELF,
  INVITE_PROFILES,
  REMOVE_PROFILES_CHAT,
  SET_TYPING,
} from "./utils/queries";
import shutdown from "./utils/shutdown";

const request = supertest(app);

describe("-- Chat Tests --", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  let chatID;

  it("Should get chat rooms", (done) => {
    const variables = {
      skip: 0,
      limit: 1,
    };

    request
      .post("/graphql")
      .send({
        query: GET_CHATPAGE,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        chatID = res.body.data.getChatPage.chatrooms[0].id;
        return done();
      });
  });

  it("Should send messages", (done) => {
    const variables = {
      chatID,
      text: "Blah Blah",
    };

    request
      .post("/graphql")
      .send({
        query: SEND_MESSAGE,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.sendMessage).toBeTruthy();
        return done();
      });
  });

  it("Should invite profiles", (done) => {
    const variables = {
      chatID,
      invitedProfiles: [user2.profileID, user1.profileID],
    };

    request
      .post("/graphql")
      .send({
        query: INVITE_PROFILES,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.inviteProfile).toBeNull();
        return done();
      });
  });

  // it("Should get inbox", (done) => {
  //   const variables = {
  //     limit: 1,
  //     skip: 0
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: GET_INBOX,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user1.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.getInbox).toBeInstanceOf(Object);
  //       done();
  //     });
  // });

  it("Should get all friends", (done) => {
    const variables = {
      limit: 1,
      chatID,
    };

    request
      .post("/graphql")
      .send({
        query: GET_FRIENDS,
        variables,
      })
      .set("Authorization", `Bearer ${user1.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getFriends).toBeInstanceOf(Object);
        return done();
      });
  });

  // it("Should get chat participants", (done) => {
  //   const variables = {
  //     id: chatID
  //   };

  //   request
  //     .post('/graphql')
  //     .send({
  //       query: GET_CHAT_PARTICIPANTS,
  //       variables
  //     })
  //     .set('Authorization', `Bearer ${user2.token}`)
  //     .expect(200)
  //     .end((err, res) => {
  //       if (err) return done(err);
  //       expect(res.body.data.chat).toBeInstanceOf(Object);
  //       done();
  //     });
  // });

  it("Should get messages", (done) => {
    const variables = {
      chatID,
      limit: 10,
    };
    request
      .post("/graphql")
      .send({
        query: GET_MESSAGES,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.getMessages).toBeInstanceOf(Object);
        return done();
      });
  });

  it("Should set typing", (done) => {
    const variables = {
      chatID,
      isTyping: true,
    };

    request
      .post("/graphql")
      .send({
        query: SET_TYPING,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.setTyping).toBeTruthy();
        return done();
      });
  });

  it("Should remove self", (done) => {
    const variables = {
      chatID,
      isBlock: false,
    };

    request
      .post("/graphql")
      .send({
        query: REMOVE_SELF,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.removeSelf).toBeTruthy();
        return done();
      });
  });

  it("Should remove profiles chat", (done) => {
    const variables = {
      chatID,
      removedProfiles: [user2.profileID],
    };

    request
      .post("/graphql")
      .send({
        query: REMOVE_PROFILES_CHAT,
        variables,
      })
      .set("Authorization", `Bearer ${user3.token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.removeProfilesChat).toBeNull();
        return done();
      });
  });
});
