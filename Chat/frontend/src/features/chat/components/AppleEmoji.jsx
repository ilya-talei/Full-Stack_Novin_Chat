import { memo } from 'react';
import {
  appleEmojiStyle,
  getAppleSheetPos,
  splitTextWithAppleEmoji,
} from '../utils/appleEmojiSheet';
import './apple-emoji.css';

/** Single Apple emoji from local spritesheet. */
export const AppleEmoji = memo(function AppleEmoji({
  id,
  native,
  size = 28,
  className = '',
  title,
}) {
  const pos = getAppleSheetPos({ id, native });
  const style = appleEmojiStyle(pos, size);
  if (!style) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} title={title}>
        {native}
      </span>
    );
  }
  return (
    <span
      className={`apple-emoji ${className}`.trim()}
      style={style}
      title={title || native}
      role="img"
      aria-label={native}
    />
  );
});

/** Render message text with Apple emoji sprites inline. */
export const AppleEmojiText = memo(function AppleEmojiText({
  text,
  size = 16,
  className = '',
  style,
  dir = 'auto',
}) {
  const parts = splitTextWithAppleEmoji(text);
  const onlyEmoji =
    parts.length > 0 && parts.every((p) => p.type === 'emoji' || !String(p.value).trim());

  return (
    <span className={className} style={style} dir={dir}>
      {parts.map((part, i) => {
        if (part.type === 'emoji') {
          const emojiSize = onlyEmoji ? size : Math.max(size * 1.15, size + 2);
          const s = appleEmojiStyle(part.pos, emojiSize);
          if (!s) return <span key={i}>{part.value}</span>;
          return (
            <span
              key={i}
              className="apple-emoji"
              style={s}
              role="img"
              aria-label={part.value}
            />
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
});
