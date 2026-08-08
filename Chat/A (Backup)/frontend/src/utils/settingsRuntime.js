const CACHE_KEYS = [
  'novin_chat_cache',
  'novin_downloads_cache',
  'novin_media_cache',
  'novin_recent_emojis',
  'novin_sticker_suggest',
];

const EMOJI_SHORTCUTS = {
  ':)': '😊',
  ':-)': '😊',
  ':(': '😢',
  ':-(': '😢',
  ':D': '😃',
  ':-D': '😃',
  ';)': '😉',
  ';-)': '😉',
  '<3': '❤️',
  '</3': '💔',
  ':p': '😛',
  ':-p': '😛',
  ':P': '😛',
  ':*': '😘',
  ':o': '😮',
  ':O': '😮',
  '^^': '😄',
  'fire': '🔥',
  'ok': '👌',
};

const ONLY_EMOJI_RE =
  /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u;

export function isEmojiOnlyMessage(text = '') {
  const t = String(text).trim();
  if (!t || t.length > 24) return false;
  try {
    return ONLY_EMOJI_RE.test(t);
  } catch {
    return false;
  }
}

export function applyEmojiShortcuts(text = '') {
  let out = String(text);
  Object.entries(EMOJI_SHORTCUTS).forEach(([from, to]) => {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'g'), to);
  });
  return out;
}

export function estimateLocalStorageBytes() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      total += key.length + val.length;
    }
  } catch {
    return 0;
  }
  return total * 2;
}

export function formatBytesFa(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

export function clearAppCache({ includeDownloads = false } = {}) {
  const removed = [];
  CACHE_KEYS.forEach((key) => {
    if (!includeDownloads && key === 'novin_downloads_cache') return;
    if (localStorage.getItem(key) != null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  });
  try {
    sessionStorage.removeItem('novin_chat_drafts');
  } catch {
    /* ignore */
  }
  return removed;
}

export function getRecentEmojis() {
  try {
    const raw = localStorage.getItem('novin_recent_emojis');
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function pushRecentEmoji(emoji) {
  if (!emoji) return;
  const prev = getRecentEmojis().filter((e) => e !== emoji);
  const next = [emoji, ...prev].slice(0, 24);
  localStorage.setItem('novin_recent_emojis', JSON.stringify(next));
  return next;
}

export function shouldNotifyForChatType(notifications, chatType) {
  if (!notifications) return true;
  if (chatType === 'personal') return notifications.privateChats !== false;
  if (chatType === 'groups') return notifications.groups !== false;
  if (chatType === 'channels') return notifications.channels !== false;
  return true;
}

export function playInAppNotificationFeedback(notifications, { previewText } = {}) {
  if (!notifications) return;

  if (notifications.inAppSounds !== false && notifications.sound !== false) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.04;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        osc.stop(ctx.currentTime + 0.2);
        window.setTimeout(() => ctx.close().catch(() => {}), 300);
      }
    } catch {
      /* ignore */
    }
  }

  if (
    (notifications.inAppVibrate !== false || notifications.vibrate !== false) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(40);
    } catch {
      /* ignore */
    }
  }

  return previewText;
}

export function filterNotificationByPrefs(notification, notifications) {
  if (!notifications) return true;
  const type = notification?.type || 'system';
  if (type === 'message') return true;
  if (type === 'reaction') return notifications.reactions !== false;
  if (type === 'mention') return notifications.mentions !== false;
  if (type === 'pinned') return notifications.pinnedMessages !== false;
  if (type === 'contact_joined') return notifications.contactJoined !== false;
  return true;
}
