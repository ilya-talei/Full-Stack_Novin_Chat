const MEMBER_KEYS = [
  'send_messages',
  'send_photos',
  'send_videos',
  'send_files',
  'send_voice',
  'send_video_messages',
  'send_stickers',
  'send_gifs',
  'send_links',
];

const OPEN = Object.fromEntries(MEMBER_KEYS.map((key) => [key, true]));
const CLOSED = Object.fromEntries(MEMBER_KEYS.map((key) => [key, false]));

export function getChatSendFlags(chat) {
  if (!chat || chat.type === 'personal') return { ...OPEN, canPost: true };

  const role = chat.role || chat.raw?.role || 'member';
  const perms = chat.permissions || chat.raw?.permissions || {};
  const isChannel = chat.type === 'channels' || chat.type === 'channel';

  if (role === 'owner') return { ...OPEN, canPost: true };

  if (role === 'admin') {
    if (isChannel && perms.post_messages === false) {
      return { ...CLOSED, canPost: false };
    }
    return { ...OPEN, canPost: true };
  }

  const flags = Object.fromEntries(
    MEMBER_KEYS.map((key) => [key, perms[key] === true])
  );
  return { ...flags, canPost: flags.send_messages };
}

export function mediaKindPermission(kind) {
  const map = {
    photo: 'send_photos',
    video: 'send_videos',
    file: 'send_files',
    voice: 'send_voice',
    videonote: 'send_video_messages',
    sticker: 'send_stickers',
    gif: 'send_gifs',
  };
  return map[kind] || 'send_files';
}

export function contentPermission(text) {
  const match = String(text || '').match(
    /⟵media:(gif|sticker|photo|video|file|voice|videonote)(?:\r?\n|$)/i
  );
  if (match) return mediaKindPermission(match[1].toLowerCase());
  if (/(?:https?:\/\/|www\.)\S+/i.test(String(text || ''))) return 'send_links';
  return 'send_messages';
}
