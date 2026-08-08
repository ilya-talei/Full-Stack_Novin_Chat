export const DEFAULT_USER_PREFS = {
  profile: {
    firstName: "",
    lastName: "",
    bio: "",
    username: "",
  },
  notifications: {
    privateChats: true,
    groups: true,
    channels: true,
    reactions: true,
    mentions: true,
    pinnedMessages: true,
    contactJoined: true,
    sound: true,
    vibrate: true,
    preview: true,
    countUnread: true,
    inAppSounds: true,
    inAppVibrate: true,
    inAppPreview: true,
  },
  privacy: {
    phoneVisibility: "contacts",
    lastSeen: "everybody",
    profilePhoto: "everybody",
    forwards: "everybody",
    calls: "everybody",
    groups: "everybody",
    voiceMessages: "everybody",
    bio: "everybody",
    birthday: "contacts",
    readReceipts: true,
    inviteLink: true,
  },
  data: {
    autoDownloadPhotos: true,
    autoDownloadVideos: false,
    autoDownloadFiles: false,
    autoDownloadVoice: true,
    autoDownloadGif: true,
    saveToGallery: false,
    useLessData: false,
    streamVideos: true,
    clearCacheOnExit: false,
  },
  chat: {
    messageTextSize: 16,
    sendByEnter: true,
    sendWithSticker: true,
    autoPlayGifs: true,
    autoPlayVideos: false,
    animations: true,
    raiseToSpeak: false,
    largeEmoji: true,
    replaceEmoji: true,
    distanceBetweenBubbles: "default",
    wallpaper: "default",
  },
  stickers: {
    suggestStickers: true,
    loopStickers: true,
    suggestAnimatedEmoji: true,
  },
  folders: {
    items: [
      { id: "all", title: "همه گفتگوها", pinned: true },
      { id: "unread", title: "خوانده‌نشده", pinned: false },
      { id: "personal", title: "شخصی", pinned: false },
      { id: "groups", title: "گروه‌ها", pinned: false },
    ],
  },
  language: "fa",
  premium: {
    active: false,
    activatedAt: null,
  },
  business: {
    enabled: false,
    hours: "",
    location: "",
    quickReply: "",
    welcomeMessage: "",
  },
  help: {
    tickets: [],
  },
};

export function deepMergePrefs(base: Record<string, unknown>, patch: Record<string, unknown>) {
  const out = structuredClone(base) as Record<string, unknown>;
  Object.keys(patch || {}).forEach((key) => {
    const pv = patch[key];
    const bv = out[key];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMergePrefs(bv as Record<string, unknown>, pv as Record<string, unknown>);
    } else {
      out[key] = pv as unknown;
    }
  });
  return out;
}
