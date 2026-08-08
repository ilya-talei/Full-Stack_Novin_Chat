const REPLY_PREFIX = '⟵reply:';
const REPLY_PREFIX_ALT = '←reply:';
const REPLY_END = '⟶\n';
const REPLY_END_ALT = '⟶';
const REPLY_FIELD = '\u001F'; // unit separator — won't appear in normal text

const REPLY_SUMMARY_LEN = 48;

/** Short one-line preview for reply quotes */
export function summarizeReplyText(text, maxLen = REPLY_SUMMARY_LEN) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen).trimEnd()}…`;
}

function sanitizeField(value, maxLen) {
  return String(value ?? '')
    .replaceAll(REPLY_FIELD, ' ')
    .replace(/[\n\r⟵⟶←→]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function encodeReplyMessage(text, replyMeta) {
  if (!replyMeta) return text;
  const id = sanitizeField(replyMeta.id, 64);
  const author = sanitizeField(replyMeta.author || 'پیام', 40);
  const quote = sanitizeField(summarizeReplyText(replyMeta.text), REPLY_SUMMARY_LEN);
  return `${REPLY_PREFIX}${id}${REPLY_FIELD}${author}${REPLY_FIELD}${quote}${REPLY_END}${text}`;
}

function findReplyEnd(text, fromIndex) {
  const withNl = text.indexOf(REPLY_END, fromIndex);
  if (withNl !== -1) return { index: withNl, length: REPLY_END.length };
  const bare = text.indexOf(REPLY_END_ALT, fromIndex);
  if (bare !== -1) {
    let length = REPLY_END_ALT.length;
    if (text[bare + length] === '\r') length += 1;
    if (text[bare + length] === '\n') length += 1;
    return { index: bare, length };
  }
  return null;
}

function parseReplyMeta(meta, body, fallbackText) {
  let id = null;
  let author = 'پیام';
  let quote = '';

  if (meta.includes(REPLY_FIELD)) {
    const parts = meta.split(REPLY_FIELD);
    id = parts[0] || null;
    author = parts[1] || 'پیام';
    quote = parts.slice(2).join(REPLY_FIELD);
  } else {
    // Legacy formats: id|author|quote  OR  author|quote
    const parts = meta.split('|');
    if (parts.length >= 3) {
      id = parts[0] || null;
      author = parts[1] || 'پیام';
      quote = parts.slice(2).join('|');
    } else if (parts.length === 2) {
      author = parts[0] || 'پیام';
      quote = parts[1] || '';
    } else {
      return { text: fallbackText, replyPreview: null };
    }
  }

  return {
    text: body,
    replyPreview: {
      id: id ? String(id) : null,
      author: String(author || 'پیام').trim() || 'پیام',
      text: summarizeReplyText(quote, REPLY_SUMMARY_LEN),
    },
  };
}

export function parseReplyMessage(raw) {
  const text = String(raw || '');
  const prefix = text.startsWith(REPLY_PREFIX)
    ? REPLY_PREFIX
    : text.startsWith(REPLY_PREFIX_ALT)
      ? REPLY_PREFIX_ALT
      : null;

  if (!prefix) {
    // Recover from older / mangled encodings that still contain reply metadata.
    const loose = text.match(/^[⟵←]\s*reply:([\s\S]*?)[⟶→](?:\r?\n)?([\s\S]*)$/u);
    if (!loose) return { text, replyPreview: null };
    return parseReplyMeta(loose[1] || '', loose[2] ?? '', text);
  }

  const end = findReplyEnd(text, prefix.length);
  if (!end) return { text, replyPreview: null };
  const meta = text.slice(prefix.length, end.index);
  const body = text.slice(end.index + end.length);
  return parseReplyMeta(meta, body, text);
}

/** Full plain text used for in-chat search (not truncated). */
export function getSearchableText(raw) {
  const { text: afterReply } = parseReplyMessage(raw);
  const { text: body } = parseForwardMessage(afterReply);
  const call = parseCallMessage(body).call || parseCallMessage(afterReply).call;
  if (call) {
    if (call.status === 'missed') return `تماس بی‌پاسخ ${call.callerName}`;
    if (call.status === 'cancelled') return `تماس لغو شده ${call.callerName}`;
    return `تماس ${call.callerName}`;
  }
  const { text: plain, media } = parseMediaMessage(body);
  if (media) return mediaLabel(media.type, media.name);
  return String(plain || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MEDIA_LABELS = {
  gif: 'گیف',
  sticker: 'استیکر',
  photo: 'عکس',
  video: 'ویدیو',
  file: 'فایل',
  voice: 'پیام صوتی',
  videonote: 'ویدیو مسیج',
};

export function mediaLabel(type, name) {
  if (type === 'file' && name) {
    const short = String(name).slice(0, 28);
    return `فایل: ${short}`;
  }
  return MEDIA_LABELS[type] || 'رسانه';
}

/** Plain body text for lists, menus, toasts — never raw reply/forward encoding. */
export function getMessagePreview(raw, maxLen = REPLY_SUMMARY_LEN) {
  const { text: afterReply } = parseReplyMessage(raw);
  const { text: body, forwarded } = parseForwardMessage(afterReply);
  const call = parseCallMessage(body).call;
  if (call) {
    if (call.status === 'missed') return `تماس بی‌پاسخ · ${call.callerName}`;
    if (call.status === 'cancelled') return `تماس لغو شد · ${call.callerName}`;
    return `تماس · ${call.callerName}`;
  }
  const { media } = parseMediaMessage(body);
  if (media) {
    return mediaLabel(media.type, media.name);
  }
  const cleaned = summarizeReplyText(body, maxLen);
  if (!cleaned) return forwarded ? 'فوروارد شده' : '';
  return forwarded ? `فوروارد: ${cleaned}` : cleaned;
}

/** Find original message for a reply preview (by id, then by text). */
export function findReplyTarget(messages, preview) {
  if (!preview || !Array.isArray(messages)) return null;

  if (preview.id) {
    const byId = messages.find((m) => String(m.id) === String(preview.id));
    if (byId) return byId;
  }

  const needle = String(preview.text || '')
    .replace(/…$/u, '')
    .trim();
  if (!needle) return null;

  const matches = messages.filter((m) => {
    const { text: t1 } = parseReplyMessage(m.text);
    const { text: body } = parseForwardMessage(t1);
    const cleaned = String(body || '').replace(/\s+/g, ' ').trim();
    return cleaned.includes(needle) || summarizeReplyText(cleaned) === preview.text;
  });

  return (
    matches.find((m) => {
      const { text: t1 } = parseReplyMessage(m.text);
      const { text: body } = parseForwardMessage(t1);
      return summarizeReplyText(body) === preview.text;
    }) ||
    matches[0] ||
    null
  );
}

export function encodeForwardMessage(text) {
  return `↗ فوروارد:\n${text}`;
}

export function parseForwardMessage(raw) {
  const text = String(raw || '');
  const prefix = '↗ فوروارد:\n';
  if (!text.startsWith(prefix)) return { text, forwarded: false };
  return { text: text.slice(prefix.length), forwarded: true };
}

const MEDIA_PREFIX = '⟵media:';
const MEDIA_TYPES = new Set([
  'gif',
  'sticker',
  'photo',
  'video',
  'file',
  'voice',
  'videonote',
]);

/**
 * Encode media as text-compatible payload.
 * gif/sticker keep legacy multiline URL form; other kinds use JSON meta.
 * @param {string} type
 * @param {string} url
 * @param {string|object} [previewOrMeta]
 */
export function encodeMediaMessage(type, url, previewOrMeta = '') {
  const kind = String(type || 'file').toLowerCase();
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return '';

  if (kind === 'gif' || kind === 'sticker') {
    const previewUrl =
      typeof previewOrMeta === 'string'
        ? previewOrMeta
        : previewOrMeta?.previewUrl || '';
    const lines = [`${MEDIA_PREFIX}${kind}`, safeUrl];
    if (previewUrl && previewUrl !== safeUrl) lines.push(String(previewUrl).trim());
    return lines.join('\n');
  }

  const extra =
    typeof previewOrMeta === 'object' && previewOrMeta
      ? previewOrMeta
      : previewOrMeta
        ? { previewUrl: String(previewOrMeta) }
        : {};

  const meta = {
    url: safeUrl,
    ...(extra.previewUrl ? { previewUrl: String(extra.previewUrl) } : {}),
    ...(extra.name ? { name: String(extra.name).slice(0, 120) } : {}),
    ...(extra.mime ? { mime: String(extra.mime).slice(0, 80) } : {}),
    ...(extra.size != null ? { size: Number(extra.size) || 0 } : {}),
    ...(extra.duration != null ? { duration: Number(extra.duration) || 0 } : {}),
  };

  return `${MEDIA_PREFIX}${MEDIA_TYPES.has(kind) ? kind : 'file'}\n${JSON.stringify(meta)}`;
}

export function parseMediaMessage(raw) {
  const text = String(raw || '');
  if (!text.startsWith(MEDIA_PREFIX)) return { text, media: null };
  const rest = text.slice(MEDIA_PREFIX.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl === -1) return { text, media: null };
  const typeRaw = rest.slice(0, firstNl).trim().toLowerCase();
  const payload = rest.slice(firstNl + 1).trim();
  if (!payload) return { text, media: null };

  if (payload.startsWith('{')) {
    try {
      const meta = JSON.parse(payload);
      const url = String(meta.url || '').trim();
      if (!url) return { text, media: null };
      const type = MEDIA_TYPES.has(typeRaw) ? typeRaw : 'file';
      return {
        text: '',
        media: {
          type,
          url,
          previewUrl: String(meta.previewUrl || url),
          name: meta.name ? String(meta.name) : '',
          mime: meta.mime ? String(meta.mime) : '',
          size: Number(meta.size) || 0,
          duration: Number(meta.duration) || 0,
        },
      };
    } catch {
      return { text, media: null };
    }
  }

  const urls = payload
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!urls[0]) return { text, media: null };
  const type = typeRaw === 'sticker' ? 'sticker' : MEDIA_TYPES.has(typeRaw) ? typeRaw : 'gif';
  return {
    text: '',
    media: {
      type,
      url: urls[0],
      previewUrl: urls[1] || urls[0],
      name: '',
      mime: '',
      size: 0,
      duration: 0,
    },
  };
}

/** Unwrap reply/forward wrappers and return media payload if present. */
export function getMessageMedia(raw) {
  const { text: afterReply } = parseReplyMessage(raw);
  const { text: body } = parseForwardMessage(afterReply);
  return parseMediaMessage(body).media;
}

const DOWNLOADABLE_MEDIA = new Set(['photo', 'video', 'file', 'voice', 'videonote', 'gif']);

export function isDownloadableMedia(media) {
  return Boolean(media?.url && DOWNLOADABLE_MEDIA.has(media.type));
}

export function defaultMediaFileName(media) {
  if (media?.name) return media.name;
  const ext =
    {
      photo: 'jpg',
      video: 'mp4',
      voice: 'webm',
      videonote: 'webm',
      gif: 'gif',
      file: 'bin',
    }[media?.type] || 'bin';
  return `${media?.type || 'file'}.${ext}`;
}

const CALL_PREFIX = '⟵call:';

/**
 * Encode a call system message (missed / cancelled / ended).
 * @param {'missed'|'cancelled'|'ended'} status
 * @param {{ callerName?: string, at?: string|Date, video?: boolean }} meta
 */
export function encodeCallMessage(status, meta = {}) {
  const kind = ['missed', 'cancelled', 'ended'].includes(status) ? status : 'missed';
  const payload = {
    callerName: String(meta.callerName || 'کاربر').slice(0, 80),
    at: meta.at ? new Date(meta.at).toISOString() : new Date().toISOString(),
    video: Boolean(meta.video),
  };
  return `${CALL_PREFIX}${kind}\n${JSON.stringify(payload)}`;
}

export function parseCallMessage(raw) {
  const text = String(raw || '');
  if (!text.startsWith(CALL_PREFIX)) return { text, call: null };
  const rest = text.slice(CALL_PREFIX.length);
  const nl = rest.indexOf('\n');
  if (nl === -1) return { text, call: null };
  const status = rest.slice(0, nl).trim();
  try {
    const meta = JSON.parse(rest.slice(nl + 1).trim() || '{}');
    return {
      text: '',
      call: {
        status: ['missed', 'cancelled', 'ended'].includes(status) ? status : 'missed',
        callerName: String(meta.callerName || 'کاربر'),
        at: meta.at || null,
        video: Boolean(meta.video),
      },
    };
  } catch {
    return { text, call: null };
  }
}

/** Unwrap wrappers then parse call payload. */
export function getMessageCall(raw) {
  const { text: afterReply } = parseReplyMessage(raw);
  const { text: body } = parseForwardMessage(afterReply);
  const { call } = parseCallMessage(body);
  if (call) return call;
  // body itself may still be call if no wrappers
  return parseCallMessage(afterReply).call || parseCallMessage(raw).call;
}
