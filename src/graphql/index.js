const GraphQL = require("graphql");

const { GraphQLObjectType, GraphQLSchema } = GraphQL;

// import the user query file we created
const UserQuery = require("./queries/User");
const ChatQuery = require("./queries/Chat");
const AdminQuery = require("./queries/Admin");
const EventQuery = require("./queries/Event");
const FlagQuery = require("./queries/Flag");
const FilterQuery = require("./queries/Filter");
const ProfileQuery = require("./queries/Profile");
const SystemQuery = require("./queries/System");

// import the user mutation file we created
const AdminMutation = require("./mutations/Admin");
const UserMutation = require("./mutations/User");
const ChatMutation = require("./mutations/Chat");
const EventMutation = require("./mutations/Event");
const FlagMutation = require("./mutations/Flag");
const ProfileMutation = require("./mutations/Profile");
const VideoChatMutation = require("./mutations/VideoChat");
const TestMutation = require("./mutations/Test");

// import subscriptions
const NewMsgSubscription = require("./subscriptions/NewMessage");
const NewNoticeSubscription = require("./subscriptions/NewNotification");
const NewInboxMsgSubscription = require("./subscriptions/NewInboxMsg");
const NewMsgActionSubscription = require("./subscriptions/NewMessageAction");
const IncomingVideoChatSubscription = require("./subscriptions/IncomingVideoChat");

// lets define our root query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  description: "This is the default root query provided by the backend",
  fields: {
    // Admin
    memberCounts: AdminQuery.memberCounts,
    currentAdmin: AdminQuery.currentAdmin,
    getFlagsByType: AdminQuery.getFlagsByType,
    getPayments: AdminQuery.getPayments,
    // User
    user: UserQuery.user,
    currentuser: UserQuery.currentuser,
    getSettings: UserQuery.getSettings,
    getCounts: UserQuery.getCounts,
    getNotifications: UserQuery.getNotifications,
    confirmEmail: UserQuery.confirmEmail,
    testCall: UserQuery.testCall,
    // Chat
    getMessages: ChatQuery.getMessages,
    getInbox: ChatQuery.getInbox,
    getFriends: ChatQuery.getFriends,
    chat: ChatQuery.chat,
    getChatPage: ChatQuery.getChatPage,
    // Event
    event: EventQuery.event,
    searchEvents: EventQuery.searchEvents,
    getMyEvents: EventQuery.getMyEvents,
    getComments: EventQuery.getComments,
    // Flag
    flag: FlagQuery.flag,
    // Filter
    filter: FilterQuery.filter,
    getFilterByUserID: FilterQuery.getFilterByUserID,
    // Profile
    profile: ProfileQuery.profile,
    searchProfiles: ProfileQuery.searchProfiles,
    generateCode: ProfileQuery.generateCode,
    // System
    version: SystemQuery.version,
    getFullLink: SystemQuery.getFullLink,
    getDemoCounts: SystemQuery.getDemoCounts,
    setFullLink: SystemQuery.setFullLink,
    hiccup: SystemQuery.hiccup,
  },
});

// lets define our root mutation
const RootMutation = new GraphQLObjectType({
  name: "Mutation",
  description: "Default mutation provided by the backend APIs",
  fields: {
    // Admin
    adminLogin: AdminMutation.adminLogin,
    adminCreate: AdminMutation.adminCreate,
    setVerification: AdminMutation.setVerification,
    toggleAlertFlag: AdminMutation.toggleAlertFlag,
    resolveFlag: AdminMutation.resolveFlag,
    toggleActive: AdminMutation.toggleActive,
    toggleBlkActive: AdminMutation.toggleBlkActive,
    addPayment: AdminMutation.addPayment,
    adminDeleteEvent: AdminMutation.adminDeleteEvent,
    // User
    updateSettings: UserMutation.updateSettings,
    submitPhoto: UserMutation.submitPhoto,
    login: UserMutation.login,
    deleteUser: UserMutation.deleteUser,
    resetPassword: UserMutation.resetPassword,
    fbResolve: UserMutation.fbResolve,
    fbResetPhone: UserMutation.fbResetPhone,
    createSubcription: UserMutation.createSubcription,
    cancelSubcription: UserMutation.cancelSubcription,
    readNotification: UserMutation.readNotification,
    seenTour: UserMutation.seenTour,
    sendPasswordResetEmail: UserMutation.sendPasswordResetEmail,
    sendPhoneResetEmail: UserMutation.sendPhoneResetEmail,
    updateLocation: UserMutation.updateLocation,
    resendVerEMail: UserMutation.resendVerEMail,
    messageAdmin: UserMutation.messageAdmin,
    noticesSeen: UserMutation.noticesSeen,
    // Flag
    flagItem: FlagMutation.flagItem,
    adminDeleteflag: FlagMutation.adminDeleteflag,
    // Profile
    linkProfile: ProfileMutation.linkProfile,
    likeProfile: ProfileMutation.likeProfile,
    blockProfile: ProfileMutation.blockProfile,
    signS3: ProfileMutation.signS3,
    unlinkProfile: ProfileMutation.unlinkProfile,
    convertToCouple: ProfileMutation.convertToCouple,
    // Event
    createEvent: EventMutation.createEvent,
    deleteEvent: EventMutation.deleteEvent,
    inviteProfileEvent: EventMutation.inviteProfile,
    removeProfileEvent: EventMutation.removeProfile,
    toggleAttendEvent: EventMutation.toggleAttend,
    postComment: EventMutation.postComment,
    deleteOldEvents: EventMutation.deleteOldEvents,
    // Chat
    sendMessage: ChatMutation.sendMessage,
    removeSelf: ChatMutation.removeSelf,
    inviteProfile: ChatMutation.inviteProfile,
    removeProfilesChat: ChatMutation.removeProfiles,
    setTyping: ChatMutation.setTyping,
    // VideoChat
    startVideoChat: VideoChatMutation.startVideoChat,
    // Test
    testload: TestMutation.testload,
    resetTest: TestMutation.resetTest,
    massload: TestMutation.massload,
  },
});

const RootSubscription = new GraphQLObjectType({
  name: "RootSubscription",
  description: "Root Subscription",
  fields: {
    messageActionSubsubscribe: NewMsgActionSubscription,
    newNoticeSubscribe: NewNoticeSubscription,
    newMessageSubscribe: NewMsgSubscription,
    newInboxMsgSubscribe: NewInboxMsgSubscription,
    incomingVideoChat: IncomingVideoChatSubscription,
  },
});

// export the schema
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
  subscription: RootSubscription,
});
