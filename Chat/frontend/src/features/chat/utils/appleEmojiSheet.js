import appleData from '@emoji-mart/data/sets/15/apple.json';
import sheetUrl from 'emoji-datasource-apple/img/apple/sheets-256/64.png?url';

/** Local Apple spritesheet (no CDN). */
export const APPLE_SHEET_URL = sheetUrl;
export const APPLE_SHEET_COLS = appleData.sheet?.cols || 61;
export const APPLE_SHEET_ROWS = appleData.sheet?.rows || 61;

/** Full emoji-mart Apple dataset (categories + sheet coords). */
export const appleEmojiData = appleData;

const byId = new Map();
const byNative = new Map();

for (const [id, emoji] of Object.entries(appleData.emojis || {})) {
  const skins = emoji?.skins || [];
  for (const skin of skins) {
    if (skin == null || skin.x == null || skin.y == null) continue;
    const pos = { x: skin.x, y: skin.y };
    if (skin === skins[0]) byId.set(id, pos);
    if (skin.native) byNative.set(skin.native, pos);
  }
}

export function getAppleSheetPos({ id, native } = {}) {
  if (id && byId.has(id)) return byId.get(id);
  if (native && byNative.has(native)) return byNative.get(native);
  return null;
}

/** emoji-mart-compatible sprite style (percentage grid). */
export function appleEmojiStyle(pos, size = 28) {
  if (!pos) return null;
  const cols = APPLE_SHEET_COLS;
  const rows = APPLE_SHEET_ROWS;
  return {
    width: size,
    height: size,
    display: 'inline-block',
    verticalAlign: '-0.15em',
    backgroundImage: `url(${APPLE_SHEET_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${100 * cols}% ${100 * rows}%`,
    backgroundPosition: `${(100 / (cols - 1)) * pos.x}% ${(100 / (rows - 1)) * pos.y}%`,
  };
}

const HAS_EMOJI_RE = /\p{Extended_Pictographic}/u;

export function textHasEmoji(text) {
  return typeof text === 'string' && HAS_EMOJI_RE.test(text);
}

let segmenter;
function getSegmenter() {
  if (!segmenter && typeof Intl !== 'undefined' && Intl.Segmenter) {
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
  return segmenter;
}

/**
 * Split text into plain / apple-emoji parts for rendering.
 * @returns {{ type: 'text'|'emoji', value: string, pos?: {x:number,y:number} }[]}
 */
export function splitTextWithAppleEmoji(text) {
  const str = String(text ?? '');
  if (!str) return [];
  if (!textHasEmoji(str)) return [{ type: 'text', value: str }];

  const seg = getSegmenter();
  const parts = [];
  let buf = '';

  const flush = () => {
    if (!buf) return;
    parts.push({ type: 'text', value: buf });
    buf = '';
  };

  if (seg) {
    for (const { segment } of seg.segment(str)) {
      const pos = byNative.get(segment);
      if (pos) {
        flush();
        parts.push({ type: 'emoji', value: segment, pos });
      } else {
        buf += segment;
      }
    }
    flush();
    return parts;
  }

  // Fallback without Segmenter: walk by code points (weaker for ZWJ)
  for (const ch of str) {
    const pos = byNative.get(ch);
    if (pos) {
      flush();
      parts.push({ type: 'emoji', value: ch, pos });
    } else {
      buf += ch;
    }
  }
  flush();
  return parts;
}
