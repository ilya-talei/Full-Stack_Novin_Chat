import { formatTime } from '@utils/formatDate';
import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiFile, FiDownload } from 'react-icons/fi';
import { IoCheckmarkDone } from 'react-icons/io5';
import { parseReplyMessage, parseForwardMessage, parseMediaMessage, parseCallMessage } from '../utils/messageMeta';
import { useSettings } from '@context/SettingsContext';
import { isEmojiOnlyMessage } from '@utils/settingsRuntime';
import { AppleEmojiText } from './AppleEmoji';
import { VoicePlayer, VideoPlayer, VideoNotePlayer } from './MediaPlayers';
import { FiPhone, FiPhoneMissed, FiVideo } from 'react-icons/fi';
import './media-players.css';

const LONG_PRESS_MS = 480;

function formatBytes(n) {
  const num = Number(n) || 0;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaBody({ media, isMe }) {
  const type = media.type;

  if (type === 'sticker') {
    return (
      <div className="overflow-hidden bg-transparent -mx-1">
        <img
          src={media.url}
          alt="استیکر"
          className="block w-[148px] h-[148px] object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (type === 'gif' || type === 'photo') {
    return (
      <div className="overflow-hidden rounded-xl -mx-1 -mt-0.5 w-full">
        <img
          src={media.url}
          alt={type === 'gif' ? 'گیف' : 'عکس'}
          className="block w-full max-h-[min(52vh,18rem)] object-cover rounded-xl"
          loading="lazy"
        />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="overflow-hidden rounded-xl -mx-1 -mt-0.5 w-full min-w-0">
        <VideoPlayer src={media.url} duration={media.duration} />
      </div>
    );
  }

  if (type === 'videonote') {
    return (
      <div className="flex justify-center py-1">
        <VideoNotePlayer src={media.url} duration={media.duration} />
      </div>
    );
  }

  if (type === 'voice') {
    return <VoicePlayer src={media.url} duration={media.duration} isMe={isMe} />;
  }

  // file
  return (
    <a
      href={media.url}
      download={media.name || undefined}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 min-w-[180px] transition-colors ${
        isMe
          ? 'bg-white/15 hover:bg-white/25 text-white'
          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-ink'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isMe ? 'bg-white/20' : 'bg-npurple-borders/15 text-npurple-borders'
        }`}
      >
        <FiFile size={18} />
      </span>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-[13px] font-medium truncate">
          {media.name || 'فایل'}
        </span>
        {media.size > 0 ? (
          <span className={`block text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-ink-muted'}`}>
            {formatBytes(media.size)}
          </span>
        ) : null}
      </span>
      <FiDownload size={16} className="opacity-70 shrink-0" />
    </a>
  );
}

function formatCallWhen(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function CallMessageCard({ call, isMe }) {
  const when = formatCallWhen(call.at);
  const missed = call.status === 'missed';
  const kind = call.video ? 'تماس ویدیویی' : 'تماس صوتی';
  let title;
  if (missed) {
    title = isMe
      ? when
        ? `تماس بی‌پاسخ در ${when}`
        : 'تماس بی‌پاسخ'
      : when
        ? `${call.callerName} در ${when} می‌خواست بهت زنگ بزنه`
        : `${call.callerName} می‌خواست بهت زنگ بزنه`;
  } else if (call.status === 'cancelled') {
    title = `تماس ${call.callerName} لغو شد`;
  } else {
    title = `تماس با ${call.callerName}`;
  }
  const Icon = missed ? FiPhoneMissed : call.video ? FiVideo : FiPhone;

  return (
    <div
      className={`call-msg ${isMe ? 'call-msg--me' : 'call-msg--other'} ${
        missed ? 'is-missed' : ''
      }`}
    >
      <span className="call-msg__ico" aria-hidden>
        <Icon size={18} />
      </span>
      <div className="call-msg__body">
        <p className="call-msg__title">{title}</p>
        <p className="call-msg__meta">{kind}</p>
      </div>
    </div>
  );
}

const FOLD_SPARKS = [
  { dx: '-36px', dy: '-10px', sz: '5px', sd: '40ms' },
  { dx: '40px', dy: '-8px', sz: '4px', sd: '70ms' },
  { dx: '-22px', dy: '12px', sz: '6px', sd: '100ms' },
  { dx: '28px', dy: '14px', sz: '4px', sd: '55ms' },
  { dx: '0px', dy: '-18px', sz: '5px', sd: '85ms' },
  { dx: '-48px', dy: '2px', sz: '3px', sd: '120ms' },
  { dx: '52px', dy: '0px', sz: '3px', sd: '95ms' },
];

export default function ChatBubble({
  message,
  selected = false,
  selectionMode = false,
  vanishing = false,
  vanishDelay = 0,
  burning = false,
  highlighted = false,
  onOpenMenu,
  onToggleSelect,
  onJumpToReply,
}) {
  const isMe = message.senderId === 'me';
  const { settings } = useSettings();
  const animationsOn = settings.chat.animations !== false;
  const textSize = settings.chat.messageTextSize || 16;
  const largeEmoji = settings.chat.largeEmoji !== false;
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const wasBurning = useRef(false);
  const [justReplaced, setJustReplaced] = useState(false);

  useEffect(() => {
    if (burning) {
      wasBurning.current = true;
      return undefined;
    }
    if (!wasBurning.current) return undefined;
    wasBurning.current = false;
    setJustReplaced(true);
    const t = window.setTimeout(() => setJustReplaced(false), 450);
    return () => window.clearTimeout(t);
  }, [burning]);
  const touchPos = useRef({ x: 0, y: 0 });

  const { text: displayText, replyPreview } = parseReplyMessage(message.text);
  const { text: afterForward, forwarded } = parseForwardMessage(displayText);
  const { call } = parseCallMessage(afterForward);
  const { text: bodyText, media } = call
    ? { text: '', media: null }
    : parseMediaMessage(afterForward);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const openMenuAt = (clientX, clientY) => {
    onOpenMenu?.({
      message,
      x: clientX,
      y: clientY,
    });
  };

  const handleContextMenu = (e) => {
    if (vanishing) return;
    e.preventDefault();
    e.stopPropagation();
    openMenuAt(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (selectionMode || vanishing) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchPos.current = { x: t.clientX, y: t.clientY };
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openMenuAt(touchPos.current.x, touchPos.current.y);
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0];
    touchPos.current = { x: t.clientX, y: t.clientY };
    const dx = Math.abs(t.clientX - touchStartPos.current.x);
    const dy = Math.abs(t.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) clearLongPress();
  };

  const handleTouchEnd = (e) => {
    clearLongPress();
    if (longPressTriggered.current) {
      e.preventDefault();
    }
  };

  const handleRowClick = () => {
    if (vanishing) return;
    if (selectionMode) onToggleSelect?.(message.id);
  };

  const handleBubbleClick = (e) => {
    if (vanishing) return;
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect?.(message.id);
      return;
    }
    if (longPressTriggered.current) {
      e.preventDefault();
    }
  };

  const delayStyle = vanishing ? { animationDelay: `${vanishDelay}ms` } : undefined;
  const emojiOnly = largeEmoji && isEmojiOnlyMessage(bodyText);
  const displaySize = emojiOnly ? Math.max(textSize * 2.2, 34) : textSize;
  const isWideMedia =
    media &&
    (media.type === 'video' ||
      media.type === 'photo' ||
      media.type === 'gif' ||
      media.type === 'voice');

  return (
    <div
      data-msg-id={String(message.id)}
      className={`flex w-full ${isMe ? 'justify-start' : 'justify-end'} select-none ${
        vanishing
          ? 'msg-fold'
          : burning
            ? 'msg-burn'
            : animationsOn
              ? isMe
                ? 'animate-msg-send'
                : 'animate-bubble-in'
              : ''
      } ${highlighted ? 'msg-highlight' : ''}`}
      style={delayStyle}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      <div
        className={`relative flex items-end gap-2 min-w-0 ${
          isWideMedia
            ? 'max-w-[min(92%,22rem)] sm:max-w-[min(78%,24rem)]'
            : 'max-w-[min(78%,17.5rem)] sm:max-w-[min(70%,22rem)]'
        } ${isMe ? 'flex-row' : 'flex-row-reverse'}`}
      >
        {selectionMode && !vanishing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(message.id);
            }}
            className={`w-5 h-5 mb-2 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              selected
                ? 'bg-npurple-borders border-npurple-borders text-white'
                : 'border-ink-muted/50 bg-transparent'
            }`}
            aria-label="انتخاب پیام"
          >
            {selected && <FiCheck size={12} />}
          </button>
        )}

        <div className="relative min-w-0 w-fit max-w-full">
          {vanishing && (
            <>
              <span className="msg-fold__trace" aria-hidden style={delayStyle} />
              {FOLD_SPARKS.map((spark, i) => (
                <span
                  key={i}
                  className="msg-fold__spark"
                  aria-hidden
                  style={{
                    ...delayStyle,
                    '--dx': spark.dx,
                    '--dy': spark.dy,
                    '--sz': spark.sz,
                    '--sd': `${vanishDelay + parseInt(spark.sd, 10)}ms`,
                  }}
                />
              ))}
            </>
          )}

          <div
            className={`w-fit max-w-full min-w-0 cursor-pointer ${
              isWideMedia ? 'px-1.5 py-1.5 sm:px-2.5 sm:py-2' : 'px-3.5 py-2.5'
            } ${
              isMe
                ? 'msg-mine rounded-[1.15rem] rounded-br-md'
                : 'msg-other rounded-[1.15rem] rounded-bl-md'
            } ${message.failed ? 'opacity-70 ring-1 ring-nerror/50' : ''} ${
              selected ? 'ring-2 ring-npurple-borders/70' : ''
            } ${vanishing ? 'msg-fold__bubble' : ''} ${burning ? 'msg-burn__bubble' : ''} ${
              justReplaced ? 'msg-edited-in' : ''
            }`}
            style={delayStyle}
            onClick={handleBubbleClick}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={clearLongPress}
          >
            {vanishing && <span className="msg-fold__sheen" aria-hidden />}
            {burning && (
              <>
                <span className="msg-burn__flame" aria-hidden />
                <span className="msg-burn__embers" aria-hidden>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <i key={i} style={{ '--i': i }} />
                  ))}
                </span>
                <span className="msg-burn__ash" aria-hidden />
              </>
            )}
            {forwarded && (
              <div
                className={`mb-1 text-[11px] font-medium ${
                  isMe ? 'text-white/70' : 'text-npurple-borders'
                }`}
              >
                فوروارد شده
              </div>
            )}

            {replyPreview && (
              <button
                type="button"
                onPointerDown={(e) => {
                  // Prevent bubble long-press / selection from stealing the tap
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJumpToReply?.(replyPreview);
                }}
                className={`mb-2 w-full max-w-full text-right rounded-lg px-2.5 py-1.5 text-[12px] border-r-2 transition-opacity cursor-pointer ${
                  isMe
                    ? 'bg-white/15 border-white/50 text-white/90 hover:bg-white/25'
                    : 'bg-black/5 dark:bg-white/5 border-npurple-borders text-ink-secondary hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <div className="font-medium text-[11px] mb-0.5 opacity-90">
                  {replyPreview.author || 'پیام'}
                </div>
                <div className="truncate opacity-80">{replyPreview.text}</div>
              </button>
            )}

            {call ? (
              <CallMessageCard call={call} isMe={isMe} />
            ) : media ? (
              <MediaBody media={media} isMe={isMe} />
            ) : (
              <p
                className={`m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                  emojiOnly ? 'leading-none text-center py-1' : 'leading-[1.65]'
                }`}
                style={{ fontSize: displaySize }}
                dir="auto"
              >
                <AppleEmojiText text={bodyText} size={displaySize} />
              </p>
            )}
            <div
              className={`mt-1.5 flex items-center gap-1 justify-end text-[10px] ${
                isMe ? 'text-white/65' : 'text-ink-muted'
              }`}
            >
              {message.failed && <span className="text-red-200">ارسال نشد</span>}
              {message.edited ? <span className="opacity-80">ویرایش شده</span> : null}
              <span className="tabular-nums">{formatTime(message.createdAt)}</span>
              {isMe &&
                !message.failed &&
                (message.pending ? (
                  <FiCheck size={13} className="opacity-60" />
                ) : message.read ? (
                  <IoCheckmarkDone
                    size={15}
                    className="msg-seen-tick text-sky-300"
                    aria-label="دیده شده"
                  />
                ) : (
                  <IoCheckmarkDone size={15} className="opacity-70" aria-label="ارسال شده" />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
