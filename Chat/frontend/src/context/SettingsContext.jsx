import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { settingsService } from '@services/settingsService';
import { useAuth } from '@context/AuthContext';

const STORAGE_KEY = 'novin_tg_settings';

export const DEFAULTS = {
  profile: {
    firstName: '',
    lastName: '',
    bio: '',
    username: '',
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
    phoneVisibility: 'contacts',
    lastSeen: 'everybody',
    profilePhoto: 'everybody',
    forwards: 'everybody',
    calls: 'everybody',
    groups: 'everybody',
    voiceMessages: 'everybody',
    bio: 'everybody',
    birthday: 'contacts',
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
    messageTextSize: 16.5,
    sendByEnter: true,
    sendWithSticker: true,
    autoPlayGifs: true,
    autoPlayVideos: false,
    animations: true,
    raiseToSpeak: false,
    largeEmoji: true,
    replaceEmoji: true,
    distanceBetweenBubbles: 'relaxed',
    wallpaper: 'soft',
  },
  stickers: {
    suggestStickers: true,
    loopStickers: true,
    suggestAnimatedEmoji: true,
  },
  folders: {
    items: [
      { id: 'all', title: 'همه گفتگوها', pinned: true },
      { id: 'unread', title: 'خوانده‌نشده', pinned: false },
      { id: 'personal', title: 'شخصی', pinned: false },
      { id: 'groups', title: 'گروه‌ها', pinned: false },
    ],
  },
  language: 'fa',
  devices: {
    sessions: [],
  },
  premium: {
    active: false,
    activatedAt: null,
  },
  business: {
    enabled: false,
    hours: '',
    location: '',
    quickReply: '',
    welcomeMessage: '',
  },
  help: {
    tickets: [],
  },
};

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return deepMerge(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  Object.keys(patch).forEach((key) => {
    if (
      patch[key] &&
      typeof patch[key] === 'object' &&
      !Array.isArray(patch[key]) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      deepMerge(base[key], patch[key]);
    } else {
      base[key] = patch[key];
    }
  });
  return base;
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(loadLocal);
  const [hydrated, setHydrated] = useState(false);
  const skipNextPersist = useRef(false);
  const saveTimer = useRef(null);
  const pendingPatch = useRef(null);

  useEffect(() => {
    document.documentElement.lang = settings.language === 'en' ? 'en' : 'fa';
    document.documentElement.dir = settings.language === 'en' ? 'ltr' : 'rtl';
  }, [settings.language]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHydrated(false);
      return undefined;
    }

    let alive = true;
    settingsService
      .getSettings()
      .then((prefs) => {
        if (!alive) return;
        skipNextPersist.current = true;
        setSettings(deepMerge(structuredClone(DEFAULTS), prefs || {}));
        setHydrated(true);
      })
      .catch(() => {
        if (!alive) return;
        setHydrated(true);
      });

    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const flushSave = useCallback(async () => {
    const patch = pendingPatch.current;
    pendingPatch.current = null;
    if (!patch || !isAuthenticated) return;
    try {
      const prefs = await settingsService.updateSettings(patch);
      skipNextPersist.current = true;
      setSettings(deepMerge(structuredClone(DEFAULTS), prefs || {}));
    } catch {
      // keep local state; retry on next change
    }
  }, [isAuthenticated]);

  const queueSave = useCallback(
    (patch) => {
      pendingPatch.current = deepMerge(pendingPatch.current || {}, patch);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        flushSave();
      }, 400);
    },
    [flushSave]
  );

  const patch = useCallback(
    (path, value) => {
      setSettings((prev) => {
        const next = structuredClone(prev);
        const keys = path.split('.');
        let cur = next;
        for (let i = 0; i < keys.length - 1; i += 1) {
          cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = value;

        const serverPatch = {};
        let sp = serverPatch;
        for (let i = 0; i < keys.length - 1; i += 1) {
          sp[keys[i]] = {};
          sp = sp[keys[i]];
        }
        sp[keys[keys.length - 1]] = value;
        queueSave(serverPatch);

        return next;
      });
    },
    [queueSave]
  );

  const setSection = useCallback(
    (section, value) => {
      setSettings((prev) => {
        const nextSection =
          typeof value === 'object' && !Array.isArray(value)
            ? { ...prev[section], ...value }
            : value;
        queueSave({ [section]: value });
        return { ...prev, [section]: nextSection };
      });
    },
    [queueSave]
  );

  const resetSection = useCallback(
    (section) => {
      const defaults = structuredClone(DEFAULTS[section]);
      setSettings((prev) => ({ ...prev, [section]: defaults }));
      queueSave({ [section]: defaults });
    },
    [queueSave]
  );

  const hydrateFromServer = useCallback(async () => {
    if (!isAuthenticated) return;
    const prefs = await settingsService.getSettings();
    skipNextPersist.current = true;
    setSettings(deepMerge(structuredClone(DEFAULTS), prefs || {}));
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      patch,
      setSection,
      resetSection,
      defaults: DEFAULTS,
      hydrated,
      hydrateFromServer,
    }),
    [settings, patch, setSection, resetSection, hydrated, hydrateFromServer]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
