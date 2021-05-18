/* Subscriptions */
export const MESSAGE_ACTION_SUB = `
  subscription {
    messageActionSubsubscribe {
      name
      isTyping
      isActive
      chatID
      seenBy
    }
  }
`;

export const NEW_MESSAGE_SUB = `
  subscription($chatID: ID!, $isMobile: String, $maxW: Int, $maxH: Int) {
    newMessageSubscribe(
      chatID: $chatID
      isMobile: $isMobile
      maxW: $maxW
      maxH: $maxH
    ) {
      id
      text
      fullImg
      fromUser {
        username
        id
        profile {
          id
        }
      }
      profilePic
      type
      createdAt
      seenBy
    }
  }
`;

export const NEW_INBOX_SUB = `
  subscription($isMobile: String) {
    newInboxMsgSubscribe(isMobile: $isMobile) {
      id
      text
      fromUser {
        username
        id
      }
      fromProfile {
        profileName
        id
      }
      createdAt
      profilePic
      chatID
      participants {
        profileName
        profilePic
        id
      }
      invited {
        profileName
        profilePic
        id
      }
      unSeenCount
      type
    }
  }
`;

export const NEW_NOTICE_SUB = `
  subscription($isMobile: String) {
    newNoticeSubscribe(isMobile: $isMobile) {
      id
      seen
      read
      type
      text
      targetID
      date
      name
      fromProfile {
        profilePic
        profileName
      }
    }
  }
`;

export const INCOMING_VIDEO_CHAT = `
  subscription {
    incomingVideoChat {
      rn
      p
    }
  }
`;

/* Mutation */
export const CREATE_SUBSCRIPTION = `
  mutation(
    $ccnum: String!
    $exp: String!
    $cvc: String!
    $fname: String!
    $lname: String!
  ) {
    createSubcription(
      ccnum: $ccnum
      exp: $exp
      cvc: $cvc
      fname: $fname
      lname: $lname
    )
  }
`;

export const UPDATE_SUBSCRIPTION = `
  mutation($token: String!, $ccLast4: String!) {
    updateSubcription(token: $token, ccLast4: $ccLast4)
  }
`;

export const SUBMIT_PHOTO = `
  mutation($type: String!, $image: String!) {
    submitPhoto(type: $type, image: $image)
  }
`;

export const NOTICES_SEEN = `
  mutation {
    noticesSeen
  }
`;

export const CANCEL_SUBSCRIPTION = `
  mutation {
    cancelSubcription
  }
`;

export const LINK_PROFILE = `
  mutation($code: String!) {
    linkProfile(code: $code) {
      profileID
      partnerName
    }
  }
`;

export const CONFIRM_HUMAN = `
  mutation($capToken: String!) {
    confirmHuman(capToken: $capToken)
  }
`;

export const RESET_CHAT = `
  mutation($chatID: ID!) {
    resetChat(chatID: $chatID)
  }
`;

export const UNLINK_PROFILE = `
  mutation {
    unlinkProfile
  }
`;

export const RESEND_EMAIL_VER = `
  mutation {
    resendVerEMail
  }
`;

export const START_VIDEO_CHAT = `
  mutation($chatID: ID!) {
    startVideoChat(chatID: $chatID) {
      p
      rn
    }
  }
`;

export const DELETE_PHOTO = `
  mutation($publicPhotoList: [String], $privatePhotoList: [String]) {
    deletePhoto(
      publicPhotoList: $publicPhotoList
      privatePhotoList: $privatePhotoList
    )
  }
`;

export const SEND_MESSAGE = `
  mutation(
    $chatID: ID
    $text: String!
    $invitedProfile: ID
    $instant: Boolean
  ) {
    sendMessage(
      chatID: $chatID
      text: $text
      invitedProfile: $invitedProfile
      instant: $instant
    )
  }
`;

export const MESSAGE_ADMIN = `
  mutation($name: String, $email: String, $text: String!, $type: String) {
    messageAdmin(name: $name, email: $email, text: $text, type: $type)
  }
`;

export const SET_TYPING = `
  mutation($chatID: ID!, $isTyping: Boolean!) {
    setTyping(chatID: $chatID, isTyping: $isTyping)
  }
`;

export const POST_COMMENT = `
  mutation($chatID: ID!, $text: String!) {
    postComment(chatID: $chatID, text: $text)
  }
`;

export const DELETE_USER = `
  mutation {
    deleteUser
  }
`;

export const UPDATE_LOCATION = `
  mutation($lat: Float!, $long: Float!, $city: String!) {
    updateLocation(lat: $lat, long: $long, city: $city)
  }
`;

export const UPDATE_SETTINGS = `
  mutation(
    $distance: Int
    $distanceMetric: String
    $profilePic: String
    $ageRange: [Int]
    $lang: String
    $interestedIn: [String]
    $city: String
    $email: String
    $username: String
    $sex: String
    $lat: Float
    $long: Float
    $visible: Boolean
    $newMsgNotify: Boolean
    $emailNotify: Boolean
    $showOnline: Boolean
    $likedOnly: Boolean
    $vibrateNotify: Boolean
    $kinks: [String]
    $about: String
    $sexuality: String
    $publicPhotoList: [String]
    $privatePhotoList: [String]
    $includeMsgs: Boolean
  ) {
    updateSettings(
      distance: $distance
      distanceMetric: $distanceMetric
      profilePic: $profilePic
      ageRange: $ageRange
      lang: $lang
      interestedIn: $interestedIn
      city: $city
      lat: $lat
      long: $long
      email: $email
      username: $username
      sex: $sex
      sexuality: $sexuality
      visible: $visible
      newMsgNotify: $newMsgNotify
      emailNotify: $emailNotify
      showOnline: $showOnline
      likedOnly: $likedOnly
      vibrateNotify: $vibrateNotify
      kinks: $kinks
      about: $about
      publicPhotoList: $publicPhotoList
      privatePhotoList: $privatePhotoList
      includeMsgs: $includeMsgs
    )
  }
`;

export const LOGIN = `
  mutation($phone: String!, $password: String) {
    login(phone: $phone, password: $password){
        token
    }
  }
`;

export const FLAG_ITEM = `
  mutation($type: String!, $reason: String!, $targetID: ID!) {
    flagItem(type: $type, reason: $reason, targetID: $targetID)
  }
`;

export const LIKE_PROFILE = `
  mutation($toProfileID: ID!) {
    likeProfile(toProfileID: $toProfileID)
  }
`;

export const BLOCK_PROFILE = `
  mutation($blockedProfileID: ID!) {
    blockProfile(blockedProfileID: $blockedProfileID)
  }
`;

export const READ_NOTIFICATION = `
  mutation($notificationID: String!, $both: Boolean) {
    readNotification(notificationID: $notificationID, both: $both)
  }
`;

export const CONVERT_COUPLE = `
  mutation($coupleProID: ID!) {
    convertToCouple(coupleProID: $coupleProID)
  }
`;

export const INVITE_PROFILES = `
  mutation($chatID: ID!, $invitedProfiles: [ID]!) {
    inviteProfile(chatID: $chatID, invitedProfiles: $invitedProfiles)
  }
`;

export const INVITE_PROFILES_EVENT = `
  mutation($eventID: ID!, $invitedProfiles: [ID]!) {
    inviteProfileEvent(eventID: $eventID, invitedProfiles: $invitedProfiles)
  }
`;

export const REMOVE_PROFILES_EVENT = `
  mutation($eventID: ID!, $removedProfiles: [ID]!) {
    removeProfileEvent(eventID: $eventID, removedProfiles: $removedProfiles)
  }
`;

export const REMOVE_PROFILES_CHAT = `
  mutation($chatID: ID!, $removedProfiles: [ID]!) {
    removeProfilesChat(chatID: $chatID, removedProfiles: $removedProfiles)
  }
`;

export const CREATE_EVENT = `
  mutation(
    $eventname: String!
    $tagline: String
    $kinks: [String]
    $interestedIn: [String]
    $description: String!
    $lat: Float!
    $long: Float!
    $address: String!
    $type: String!
    $startTime: String!
    $endTime: String!
    $image: String
    $eventID: ID
    $isImageAlt: Boolean
  ) {
    createEvent(
      eventname: $eventname
      tagline: $tagline
      kinks: $kinks
      interestedIn: $interestedIn
      description: $description
      lat: $lat
      long: $long
      startTime: $startTime
      endTime: $endTime
      eventID: $eventID
      address: $address
      image: $image
      type: $type
      isImageAlt: $isImageAlt
    ) {
      id
    }
  }
`;

export const SEEN_TOUR = `
  mutation($tour: String!) {
    seenTour(tour: $tour)
  }
`;

export const DELETE_EVENT = `
  mutation($eventID: ID!) {
    deleteEvent(eventID: $eventID)
  }
`;

export const TOGGLE_EVENT_ATTEND = `
  mutation($eventID: ID!) {
    toggleAttendEvent(eventID: $eventID)
  }
`;

export const SEND_PHONE_RESET_EMAIL = `
  mutation($phone: String!) {
    sendPhoneResetEmail(phone: $phone)
  }
`;

export const RESET_PASSWORD = `
  mutation($password: String!, $token: String, $currPassword: String) {
    resetPassword(
      password: $password
      token: $token
      currPassword: $currPassword
    )
  }
`;

export const SEND_PASSWORD_RESET_EMAIL = `
  mutation($phone: String!, $email: String!) {
    sendPasswordResetEmail(phone: $phone, email: $email)
  }
`;

export const FB_RESOLVE = `
  mutation(
    $csrf: String!
    $code: String!
    $isCreate: Boolean!
    $email: String
    $password: String
    $username: String
    $lang: String
    $dob: String
    $sex: String
    $interestedIn: [String]
    $isCouple: Boolean
    $ref: String
    $cid: String
  ) {
    fbResolve(
      csrf: $csrf
      code: $code
      isCreate: $isCreate
      email: $email
      password: $password
      username: $username
      lang: $lang
      dob: $dob
      sex: $sex
      interestedIn: $interestedIn
      isCouple: $isCouple
      ref: $ref
      cid: $cid
    ) {
      token
      access
    }
  }
`;

export const SIGNS3 = `
  mutation($filetype: String!) {
    signS3(filetype: $filetype) {
      key
      signedRequest
    }
  }
`;

export const REMOVE_SELF = `
  mutation($chatID: ID!, $isBlock: Boolean) {
    removeSelf(chatID: $chatID, isBlock: $isBlock)
  }
`;
/* Queries */
export const SEARCH_EVENTS = `
  query(
    $long: Float!
    $lat: Float!
    $maxDistance: Int!
    $kinks: [String]
    $limit: Int!
    $skip: Int!
  )
    @connection(
      key: "searchEvents"
      filter: ["long", "lat", "maxDistance", "kinks"]
    ) {
    searchEvents(
      long: $long
      lat: $lat
      maxDistance: $maxDistance
      kinks: $kinks
      limit: $limit
      skip: $skip
    ) {
      id
      eventname
      type
      image
      participants {
        profileName
        profilePic
        id
      }
      description
      kinks
      interestedIn
      address
      startTime
      distance
      ownerProfile {
        profilePic
        profileName
        id
      }
    }
  }
`;

export const SEARCH_PROFILES = `
  query(
    $searchType: String
    $city: String
    $long: Float!
    $lat: Float!
    $distance: Int!
    $interestedIn: [String]!
    $ageRange: [Int]!
    $limit: Int!
    $skip: Int!
    $isMobile: String
  )
    @connection(
      key: "searchProfiles"
      filter: [
        "long"
        "lat"
        "distance"
        "interestedIn"
        "ageRange"
        "searchType"
      ]
    ) {
    searchProfiles(
      searchType: $searchType
      city: $city
      long: $long
      lat: $lat
      distance: $distance
      interestedIn: $interestedIn
      ageRange: $ageRange
      limit: $limit
      skip: $skip
      isMobile: $isMobile
    ) {
      message
      profiles {
        id
        about
        kinks
        profileName
        profilePic
        distance
        users {
          id
          username
          dob
          sex
          verifications {
            stdVer {
              active
            }
            photoVer {
              active
            }
          }
        }
        publicCode
        showOnline
        updatedAt
        online
      }
      featuredProfiles {
        id
        about
        kinks
        profileName
        profilePic
        distance
        users {
          id
          username
          dob
          sex
          verifications {
            stdVer {
              active
            }
            photoVer {
              active
            }
          }
        }
        publicCode
        showOnline
        updatedAt
        online
      }
    }
  }
`;

export const GET_EVENT = `
  query($id: ID!, $isMobile: String) {
    event(id: $id, isMobile: $isMobile){
      id
      eventname
      type
      image
      participants {
        profileName
        profilePic
        id
      }
      description
      kinks
      interestedIn
      ownerProfile {
        profilePic
        profileName
        id
      }
      address
      startTime
      endTime
      distance
      chatID
      invited {
        id
      }
      createdAt
      lat
      long
      tagline
    }
  }
`;

export const GET_FLAG = `
query($id: ID,$targetID:ID) {
    flag(id: $id,targetID:$targetID){
        id
        targetID
        type
        reason
    }
  }
`;

export const GET_INBOX = `
  query($limit: Int!, $skip: Int!, $isMobile: String) {
    getInbox(limit: $limit, skip: $skip, isMobile: $isMobile)
      @connection(key: "getInbox") {
      id
      text
      typingText
      typingList
      fromUser {
        username
        id
      }
      fromProfile {
        profileName
        id
      }
      createdAt
      profilePic
      chatID
      participants {
        profileName
        profilePic
        id
      }
      unSeenCount
      type
      blackMember
    }
  }
`;

export const GET_MY_EVENTS = `
  query {
    getMyEvents {
      id
      eventname
      type
      image
      participants {
        profileName
        profilePic
        id
      }
      description
      kinks
      interestedIn
      address
      startTime
      endTime
      distance
      ownerProfile {
        profilePic
        profileName
        id
      }
    }
  }
`;
export const GET_FRIENDS = `
  query(
    $limit: Int!
    $skip: Int
    $chatID: ID
    $isEvent: Boolean
    $isMobile: String
  ) {
    getFriends(
      limit: $limit
      skip: $skip
      chatID: $chatID
      isEvent: $isEvent
      isMobile: $isMobile
    ) {
      profilePic
      profileName
      id
    }
  }
`;

export const GET_CHAT_PARTICIPANTS = `
  query($chatID: ID!, $isMobile: String) {
    chat(id: $chatID, isMobile: $isMobile) {
      participants {
        profilePic
        profileName
        id
      }
    }
  }
`;

export const GET_EVENT_PARTICIPANTS = `
  query($eventID: ID!, $isMobile: String) {
    event(id: $eventID, isMobile: $isMobile) {
      participants {
        profilePic
        profileName
        id
      }
    }
  }
`;

export const GET_NOTIFICATIONS = `
  query($limit: Int!, $skip: Int, $isMobile: String) {
    getNotifications(limit: $limit, skip: $skip, isMobile: $isMobile)
      @connection(key: "getNotifications") {
      notifications {
        id
        seen
        read
        type
        text
        targetID
        date
        body
        name
        event
        coupleProID
        fromProfile {
          profilePic
          profileName
        }
      }
      total
    }
  }
`;

export const GET_MESSAGES = `
  query(
    $chatID: ID!
    $limit: Int!
    $cursor: String
    $isMobile: String
    $maxW: Int
    $maxH: Int
  ) {
    getMessages(
      chatID: $chatID
      limit: $limit
      cursor: $cursor
      isMobile: $isMobile
      maxW: $maxW
      maxH: $maxH
    ) {
      id
      name
      updatedAt
      ownerProfile {
        id
      }
      participants {
        id
        profilePic
        profileName
        updatedAt
        online
        showOnline
        users {
          username
          id
        }
      }
      messages {
        id
        text
        fullImg
        fromUser {
          username
          id
          profile {
            id
          }
        }
        profilePic
        type
        createdAt
        seenBy
      }
      typingText
      typingList
    }
  }
`;

export const GET_COMMENTS = `
  query($chatID: ID!, $limit: Int!, $cursor: String) {
    getComments(chatID: $chatID, limit: $limit, cursor: $cursor) {
      messages {
        id
        text
        fromUser {
          username
          id
          profile {
            id
          }
        }
        profilePic
        type
        createdAt
        blackMember
      }
    }
  }
`;

export const GET_COUNTS = `
  query {
    getCounts {
      msgsCount
      noticesCount
      newMsg
      alert {
        id
        type
        text
      }
    }
  }
`;

export const CONFIRM_EMAIL = `
  query($token: String!) {
    confirmEmail(token: $token)
  }
`;

export const GET_DEMO_COUNTS = `
  query {
    getDemoCounts {
      malesNum
      femalesNum
      couplesNum
    }
  }
`;

export const GET_CURRENT_USER = `
  query($isMobile: String) {
    currentuser(isMobile: $isMobile) {
      username
      userID
      profileID
      profilePic
      blackMember {
        active
        renewalDate
      }
      isProfileOK
      isEmailOK
      announcement
      distanceMetric
      coupleProfileName
      location {
        city
        crds {
          long
          lat
        }
      }
      active
      captchaReq
      likesSent
      createdAt
    }
  }
`;

export const GET_SEARCH_SETTINGS = `
  query {
    getSettings {
      distance
      distanceMetric
      ageRange
      lang
      interestedIn
      city
    }
  }
`;

export const GET_SETTINGS = `
  query($isMobile: String, $maxW: Int, $maxH: Int) {
    getSettings(isMobile: $isMobile, maxW: $maxW, maxH: $maxH) {
      distance
      distanceMetric
      ageRange
      lang
      interestedIn
      city
      lat
      long
      visible
      newMsgNotify
      emailNotify
      showOnline
      likedOnly
      vibrateNotify
      profilePic
      profilePicUrl
      couplePartner
      includeMsgs
      lastActive
      users {
        username
        verifications {
          photoVer {
            active
          }
          stdVer {
            active
          }
        }
      }
      publicPhotos {
        smallUrl
        url
        key
        id
      }
      privatePhotos {
        smallUrl
        url
        key
        id
      }
      about
      kinks
      sexuality
      password
      ccLast4
      verifications {
        photo
        std
      }
    }
  }
`;

export const GENERATE_CODE = `
  query {
    generateCode
  }
`;

export const GET_PROFILE = `
  query($id: ID!, $isMobile: String, $maxW: Int, $maxH: Int) {
    profile(id: $id, isMobile: $isMobile, maxW: $maxW, maxH: $maxH)
      @connection(key: "profile", filter: ["id"]) {
      id
      about
      kinks
      profilePic
      profileName
      interestedIn
      publicPhotos {
        smallUrl
        url
        id
      }
      privatePhotos {
        smallUrl
        url
        id
      }
      users {
        id
        username
        dob
        sex
        sexuality
        verifications {
          stdVer {
            active
          }
          photoVer {
            active
          }
        }
      }
      showOnline
      publicCode
      distance
      updatedAt
      online
      likedByMe
      msgdByMe
    }
  }
`;

export const GET_FULL_LINK = `
  query($shortenedUrl: String!) {
    getFullLink(shortenedUrl: $shortenedUrl)
  }
`;

export const SET_FULL_LINK = `
  query($url: String!) {
    setFullLink(url: $url)
  }
`;

export const GET_CHATPAGE = `
  query($skip: Int!, $limit: Int!, $isMobile: String) {
    getChatPage(skip: $skip, limit: $limit, isMobile: $isMobile) {
      chatrooms {
        id
        name
        numParticipants
      }
      ftMeetCount
    }
  }
`;
