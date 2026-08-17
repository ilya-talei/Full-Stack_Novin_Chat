import { useState, useRef, useEffect, useMemo } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';
import { IoSend, IoCheckmark } from 'react-icons/io5';
import {
  FiX,
  FiEdit2,
  FiPaperclip,
  FiImage,
  FiVideo,
  FiFile,
  FiMic,
  FiCamera,
  FiSquare,
} from 'react-icons/fi';
import { useChat } from '@context/ChatContext';
import { useTheme } from '@context/ThemeContext';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { socketService } from '@services/socketService';
import { chatService } from '@services/chatService';
import LiquidGlass from '@components/ui/LiquidGlass';
import { CHAT_INPUT_GLASS, chatGlassOverlay, CHAT_GLASS_ACCENT_OVERLAY } from '@constants/glass';
import {
  encodeReplyMessage,
  encodeForwardMessage,
  encodeMediaMessage,
} from '../utils/messageMeta';
import { contentPermission, getChatSendFlags, mediaKindPermission } from '../utils/chatPermissions';
import {
  applyEmojiShortcuts,
  getRecentEmojis,
  pushRecentEmoji,
} from '@utils/settingsRuntime';
import MediaPicker from './MediaPicker';
import './media-picker.css';

const EMOJIS = [
  '😀', '😁', '😂', '🥹', '😍', '🤩', '😉', '😊',
  '🙏', '👍', '👎', '👏', '🔥', '❤️', '💙', '✨',
  '🎉', '😎', '🤔', '😅', '😭', '😡', '🤝', '✅',
];

const ANIMATED_EMOJIS = ['✨', '🔥', '🎉', '❤️', '😂', '🤩'];

const LIMITS = {
  photo: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  file: 25 * 1024 * 1024,
  voice: 10 * 1024 * 1024,
  videonote: 50 * 1024 * 1024,
};

const VIDEO_NOTE_MAX_SEC = 60;

function formatRecTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function TypewriteBox({
  replyTo = null,
  replyLanding = false,
  editingMessage = null,
  onClearReply,
  onClearEdit,
  onConfirmEdit,
  onJumpToReply,
  onSent,
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const [showAttach, setShowAttach] = useState(false);
  const [recent, setRecent] = useState(() => getRecentEmojis());
  const [recMode, setRecMode] = useState(null); // 'voice' | 'videonote' | null
  const [recSeconds, setRecSeconds] = useState(0);

  const { sendMessage, activeChat } = useChat();
  const { isDark } = useTheme();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recTimerRef = useRef(null);
  const recStartedAt = useRef(0);
  const videoPreviewRef = useRef(null);
  const isEditing = Boolean(editingMessage?.id);
  const pickerActivity =
    pickerTab === 'sticker'
      ? 'choosing_sticker'
      : pickerTab === 'gif'
        ? 'choosing_gif'
        : 'choosing_emoji';
  const composerActivity = showPicker
    ? pickerActivity
    : text.length > 0 || Boolean(replyTo)
      ? 'typing'
      : null;

  const suggestStickers = settings.stickers?.suggestStickers !== false;
  const suggestAnimated = settings.stickers?.suggestAnimatedEmoji !== false;
  const loopStickers = settings.stickers?.loopStickers !== false;
  const replaceEmoji = settings.chat?.replaceEmoji !== false;
  const sendWithSticker = settings.chat?.sendWithSticker !== false;

  const suggestions = useMemo(() => {
    if (!suggestStickers || !text.trim()) return [];
    const q = text.trim().toLowerCase();
    if (q.length > 8) return [];
    return [...recent, ...EMOJIS]
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .filter(() => q.length <= 2)
      .slice(0, 8);
  }, [text, suggestStickers, recent]);

  const stopTracks = () => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearRecTimer = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  const resetRecorder = () => {
    clearRecTimer();
    const rec = mediaRecorderRef.current;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = null;
      try {
        if (rec.state === 'recording') rec.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    setRecMode(null);
    setRecSeconds(0);
  };

  useEffect(() => {
    setText('');
    setShowPicker(false);
    setShowAttach(false);
    setSending(false);
    resetRecorder();
    onClearReply?.();
    onClearEdit?.();
    return () => {
      if (activeChat) socketService.emitTyping(activeChat.id, false);
      resetRecorder();
    };
  }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat || !composerActivity || sending) {
      if (activeChat) socketService.emitTyping(activeChat.id, false);
      return undefined;
    }

    const emit = () => {
      socketService.emitTyping(activeChat.id, true, composerActivity);
    };
    emit();
    const heartbeat = window.setInterval(emit, 2500);

    return () => {
      window.clearInterval(heartbeat);
      socketService.emitTyping(activeChat.id, false);
    };
  }, [activeChat?.id, composerActivity, sending]);

  useEffect(() => {
    if (editingMessage?.id) {
      setText(editingMessage.body || '');
      onClearReply?.();
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }, [editingMessage?.id]);

  useEffect(() => {
    if (replyTo && !isEditing) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }, [replyTo?.id, isEditing]);

  useEffect(() => {
    if (!settings.chat?.raiseToSpeak) return undefined;
    const onOrient = (e) => {
      const beta = e.beta;
      if (typeof beta !== 'number') return;
      if (beta > 55 && beta < 95) {
        inputRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [settings.chat?.raiseToSpeak]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    if (!showAttach) return undefined;
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setShowAttach(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [showAttach]);

  useEffect(() => {
    if (recMode === 'videonote' && videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
      videoPreviewRef.current.play?.().catch(() => {});
    }
  }, [recMode]);

  // Sending must never move focus away from the textarea, otherwise mobile
  // keyboards close and reopen on every message.
  const keepInputFocus = () => {
    const el = inputRef.current;
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
  };

  const handleSend = async (rawText) => {
    let value = String(rawText ?? text).trim();
    if (!value || !activeChat || sending) return;
    if (replaceEmoji && !String(rawText ?? '').startsWith('⟵media:')) {
      value = applyEmojiShortcuts(value).trim();
    }
    if (!value) return;

    const sendFlags = getChatSendFlags(activeChat);
    const needed = contentPermission(value);
    if (!sendFlags[needed]) {
      addToast('ارسال این نوع محتوا در این گفتگو مجاز نیست', 'error');
      return;
    }

    if (isEditing) {
      let payload = value;
      if (editingMessage.replyPreview) {
        payload = encodeReplyMessage(value, editingMessage.replyPreview);
      }
      if (editingMessage.forwarded) {
        payload = encodeForwardMessage(payload);
      }
      setSending(true);
      setShowPicker(false);
      try {
        await onConfirmEdit?.(payload, editingMessage);
        setText('');
        onClearEdit?.();
        if (!showPicker) keepInputFocus();
        onSent?.();
      } catch (err) {
        addToast(err?.message || 'ویرایش ناموفق بود', 'error');
      } finally {
        setSending(false);
      }
      return;
    }

    const payload = value.startsWith('⟵media:')
      ? value
      : encodeReplyMessage(value, replyTo);

    setSending(true);
    setShowPicker(false);
    try {
      await sendMessage(payload);
      setText('');
      onClearReply?.();
      socketService.emitTyping(activeChat.id, false);
      if (!showPicker) keepInputFocus();
      onSent?.();
    } catch (err) {
      addToast(err?.message || 'ارسال پیام ناموفق بود', 'error');
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file, kind, extra = {}) => {
    if (!activeChat || sending || isEditing) return;
    if (!getChatSendFlags(activeChat)[mediaKindPermission(kind)]) {
      addToast('ارسال این نوع رسانه در این گفتگو مجاز نیست', 'error');
      return;
    }
    const limit = LIMITS[kind] || LIMITS.file;
    if (file.size > limit) {
      addToast('حجم فایل بیش از حد مجاز است', 'error');
      return;
    }

    setSending(true);
    setShowAttach(false);
    setShowPicker(false);
    try {
      const uploaded = await chatService.uploadMedia(activeChat.id, file, kind);
      const url = uploaded.path;
      let payload = encodeMediaMessage(kind, url, {
        name: uploaded.originalName || file.name,
        mime: uploaded.mimeType || file.type,
        size: uploaded.size || file.size,
        ...extra,
      });
      if (replyTo) {
        payload = encodeReplyMessage(payload, replyTo);
      }
      await sendMessage(payload);
      onClearReply?.();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'آپلود ناموفق بود', 'error');
    } finally {
      setSending(false);
    }
  };

  const onPickFile = (kind) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await uploadAndSend(file, kind);
  };

  const startRecording = async (mode) => {
    if (sending || isEditing || recMode) return;
    if (!getChatSendFlags(activeChat)[mediaKindPermission(mode)]) {
      addToast('ارسال این نوع پیام در این گفتگو مجاز نیست', 'error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast('مرورگر از ضبط پشتیبانی نمی‌کند', 'error');
      return;
    }

    try {
      const constraints =
        mode === 'videonote'
          ? { audio: true, video: { facingMode: 'user', width: 480, height: 480 } }
          : { audio: true, video: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeCandidates =
        mode === 'videonote'
          ? ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']
          : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];

      const mimeType = mimeCandidates.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      });

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        clearRecTimer();
        const duration = Math.max(1, Math.round((Date.now() - recStartedAt.current) / 1000));
        const blobType = recorder.mimeType || (mode === 'videonote' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunksRef.current, { type: blobType });
        stopTracks();
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        if (blob.size < 200) {
          setRecMode(null);
          setRecSeconds(0);
          addToast('ضبط خیلی کوتاه بود', 'error');
          return;
        }

        setSending(true);
        setRecMode(null);
        setRecSeconds(0);

        const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File(
          [blob],
          mode === 'videonote' ? `videonote.${ext}` : `voice.${ext}`,
          { type: blobType },
        );
        try {
          const uploaded = await chatService.uploadMedia(activeChat.id, file, mode);
          let payload = encodeMediaMessage(mode, uploaded.path, {
            name: uploaded.originalName || file.name,
            mime: uploaded.mimeType || file.type,
            size: uploaded.size || file.size,
            duration,
          });
          if (replyTo) {
            payload = encodeReplyMessage(payload, replyTo);
          }
          await sendMessage(payload);
          onClearReply?.();
        } catch (err) {
          addToast(err?.response?.data?.message || err?.message || 'آپلود ناموفق بود', 'error');
        } finally {
          setSending(false);
        }
      };

      recorder.start(250);
      recStartedAt.current = Date.now();
      setRecSeconds(0);
      setRecMode(mode);
      clearRecTimer();
      recTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recStartedAt.current) / 1000);
        setRecSeconds(elapsed);
        if (mode === 'videonote' && elapsed >= VIDEO_NOTE_MAX_SEC) {
          stopRecording();
        }
      }, 250);
    } catch {
      stopTracks();
      addToast('دسترسی به میکروفون/دوربین لازم است', 'error');
    }
  };

  const stopRecording = () => {
    clearRecTimer();
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    } else {
      resetRecorder();
    }
  };

  const cancelRecording = () => {
    resetRecorder();
  };

  const handleChange = (e) => {
    let next = e.target.value;
    if (replaceEmoji) next = applyEmojiShortcuts(next);
    setText(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      setText('');
      onClearEdit?.();
      return;
    }
    if (e.key === 'Escape' && recMode) {
      e.preventDefault();
      cancelRecording();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!settings.chat.sendByEnter && !isEditing) return;
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    if (!emoji) return;
    setRecent(pushRecentEmoji(emoji) || getRecentEmojis());
    if (!isEditing && sendWithSticker && !text.trim()) {
      handleSend(emoji);
      return;
    }
    setText((prev) => `${prev}${emoji}`);
    if (!showPicker) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  const handleMediaSelect = (item) => {
    if (!item?.url || isEditing) return;
    const payload = encodeMediaMessage(item.kind, item.url, item.previewUrl);
    handleSend(payload);
  };

  const handleBackspace = () => {
    setText((prev) => {
      if (!prev) return prev;
      const chars = [...prev];
      chars.pop();
      return chars.join('');
    });
    if (!showPicker) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  const handlePickerToggle = () => {
    const nextOpen = !showPicker;
    setShowAttach(false);
    setShowPicker(nextOpen);

    const isMobile =
      window.matchMedia?.('(max-width: 640px), (pointer: coarse)').matches;
    if (nextOpen && isMobile) {
      inputRef.current?.blur();
    } else if (!nextOpen) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  const closePicker = () => {
    setShowPicker(false);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  if (!activeChat) return null;

  const isChannel = activeChat.type === 'channels';
  const flags = getChatSendFlags(activeChat);
  const canComposeText = flags.send_messages !== false;
  const canAttach =
    flags.send_photos || flags.send_videos || flags.send_files;
  const canVoice = Boolean(flags.send_voice);
  const canVideoNote = Boolean(flags.send_video_messages);
  const canSend = Boolean(text.trim()) && !sending && canComposeText;
  const showMediaActions =
    !isEditing && !text.trim() && !recMode && (canVoice || canVideoNote);
  const allowedPickerTabs = [
    'emoji',
    flags.send_stickers ? 'sticker' : null,
    flags.send_gifs ? 'gif' : null,
  ].filter(Boolean);

  const isMobileComposer =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(max-width: 640px), (pointer: coarse)').matches;

  return (
    <div
      className={`chat-composer px-3 sm:px-4 pb-3 pt-2 ${showPicker ? 'is-picker-open' : ''}`}
      ref={boxRef}
      data-composer-root
      data-picker-open={showPicker ? 'true' : 'false'}
    >
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile('photo')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onPickFile('video')}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onPickFile('file')}
      />

      <div className="relative max-w-3xl mx-auto flex flex-col gap-2">
        {isEditing ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <div className="w-0.5 self-stretch rounded-full bg-amber-500 shrink-0" />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-300 flex items-center gap-1.5 justify-end">
                <FiEdit2 size={12} />
                در حال ویرایش
              </p>
              <p className="text-xs text-ink-muted truncate mt-0.5 max-w-full">
                {editingMessage.preview || editingMessage.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setText('');
                onClearEdit?.();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-white/10 shrink-0"
              aria-label="لغو ویرایش"
            >
              <FiX size={14} />
            </button>
          </div>
        ) : null}

        {(replyTo || replyLanding) && !isEditing && (
          <div
            data-reply-slot
            className={`flex items-start gap-2 rounded-2xl border border-hairline/10 bg-[rgb(var(--surface-panel))] px-3 py-2 ${
              replyTo ? 'reply-bar-in' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="w-0.5 self-stretch rounded-full bg-npurple-borders shrink-0" />
            {replyTo ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onJumpToReply?.({
                      id: replyTo.id,
                      text: replyTo.text,
                      author: replyTo.author,
                    })
                  }
                  className="min-w-0 flex-1 text-right hover:opacity-90 transition-opacity"
                >
                  <p className="text-[11px] font-medium text-npurple-borders">
                    ریپلای به {replyTo.author || 'پیام'}
                  </p>
                  <p className="text-xs text-ink-muted truncate mt-0.5 max-w-full">
                    {replyTo.text}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onClearReply?.()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-white/10 shrink-0"
                  aria-label="لغو ریپلای"
                >
                  <FiX size={14} />
                </button>
              </>
            ) : (
              <div className="min-w-0 flex-1 h-9" />
            )}
          </div>
        )}

        {suggestions.length > 0 && !isEditing && !recMode ? (
          <div className="flex gap-1 overflow-x-auto px-1">
            {suggestions.map((emoji) => (
              <button
                key={`sug-${emoji}`}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className={`h-9 w-9 rounded-xl bg-[rgb(var(--surface-panel))] border border-hairline/10 text-lg ${
                  loopStickers && suggestAnimated && ANIMATED_EMOJIS.includes(emoji)
                    ? 'animate-pulse'
                    : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {recMode ? (
          <div className="composer-rec">
            {recMode === 'videonote' ? (
              <div className="composer-rec__vn">
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  autoPlay
                  className="composer-rec__vn-video"
                />
              </div>
            ) : (
              <div className="composer-rec__wave" aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
            <div className="composer-rec__meta">
              <span className="composer-rec__dot" />
              <span className="tabular-nums">{formatRecTime(recSeconds)}</span>
              <span className="text-ink-muted text-xs">
                {recMode === 'videonote' ? 'ویدیو مسیج' : 'پیام صوتی'}
              </span>
            </div>
            <div className="composer-rec__actions">
              <button
                type="button"
                onClick={cancelRecording}
                className="composer-rec__btn composer-rec__btn--cancel"
                aria-label="لغو"
              >
                <FiX size={18} />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="composer-rec__btn composer-rec__btn--stop"
                aria-label="ارسال"
              >
                <FiSquare size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="composer-stack relative">
          <div className="composer-row flex items-end gap-2">
            <div className="composer-input-wrap relative flex-1 min-w-0">
              {showAttach && !isEditing && canAttach ? (
                <div className="composer-attach" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!flags.send_photos}
                    onClick={() => {
                      setShowAttach(false);
                      photoInputRef.current?.click();
                    }}
                  >
                    <FiImage size={16} />
                    عکس
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!flags.send_videos}
                    onClick={() => {
                      setShowAttach(false);
                      videoInputRef.current?.click();
                    }}
                  >
                    <FiVideo size={16} />
                    ویدیو
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!flags.send_files}
                    onClick={() => {
                      setShowAttach(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <FiFile size={16} />
                    فایل
                  </button>
                </div>
              ) : null}

              <LiquidGlass
                fill
                className="rounded-[1.75rem]"
                contentClassName="items-end"
                {...CHAT_INPUT_GLASS}
                overlay={chatGlassOverlay(isDark)}
              >
                <div className="composer-input-row w-full flex items-end gap-0.5 px-1.5 py-1">
                  <button
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={handlePickerToggle}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-colors ${
                      showPicker
                        ? 'text-npurple-borders bg-npurple-borders/15'
                        : 'text-ink hover:text-npurple-borders hover:bg-npurple-borders/10'
                    }`}
                    title="ایموجی و گیف"
                    aria-label="ایموجی و گیف"
                    disabled={sending}
                  >
                    <BsEmojiSmile size={20} strokeWidth={0.5} />
                  </button>

                  {!isEditing && canAttach ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPicker(false);
                        setShowAttach((v) => !v);
                      }}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-colors ${
                        showAttach
                          ? 'text-npurple-borders bg-npurple-borders/15'
                          : 'text-ink hover:text-npurple-borders hover:bg-npurple-borders/10'
                      }`}
                      title="پیوست"
                      aria-label="پیوست"
                      disabled={sending}
                    >
                      <FiPaperclip size={18} />
                    </button>
                  ) : null}

                  <textarea
                    ref={inputRef}
                    rows={1}
                    readOnly={showPicker && isMobileComposer}
                    inputMode={showPicker && isMobileComposer ? 'none' : 'text'}
                    className="composer-textarea bg-transparent outline-none flex-1 text-ink placeholder:text-ink-muted text-[14px] leading-5 resize-none max-h-[120px] py-2 px-0.5 min-w-0"
                    placeholder={
                      !canComposeText
                        ? 'ارسال پیام در این گفتگو مجاز نیست'
                        : isEditing
                        ? 'متن ویرایش‌شده...'
                        : isChannel
                          ? 'پیام در کانال...'
                          : 'پیام...'
                    }
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    dir="auto"
                    disabled={!canComposeText && !isEditing}
                  />
                </div>
              </LiquidGlass>
            </div>

            {showMediaActions ? (
              <>
                {canVideoNote ? (
                  <LiquidGlass
                    button
                    className="composer-action rounded-xl shrink-0"
                    {...CHAT_INPUT_GLASS}
                    overlay={chatGlassOverlay(isDark)}
                  >
                    <button
                      type="button"
                      onClick={() => startRecording('videonote')}
                      disabled={sending}
                      aria-label="ویدیو مسیج"
                      title="ویدیو مسیج کوتاه"
                      className="composer-action-button w-11 h-11 flex items-center justify-center rounded-xl text-ink hover:text-npurple-borders transition-colors"
                    >
                      <FiCamera size={18} />
                    </button>
                  </LiquidGlass>
                ) : null}
                {canVoice ? (
                  <LiquidGlass
                    button
                    className="composer-action rounded-xl shrink-0"
                    {...CHAT_INPUT_GLASS}
                    overlay={CHAT_GLASS_ACCENT_OVERLAY}
                  >
                    <button
                      type="button"
                      onClick={() => startRecording('voice')}
                      disabled={sending}
                      aria-label="پیام صوتی"
                      title="پیام صوتی"
                      className="composer-action-button w-11 h-11 flex items-center justify-center rounded-xl text-white transition-colors"
                    >
                      {sending ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiMic size={18} />
                      )}
                    </button>
                  </LiquidGlass>
                ) : null}
              </>
            ) : (
              <LiquidGlass
                button
                className="composer-action rounded-xl shrink-0"
                {...CHAT_INPUT_GLASS}
                overlay={canSend ? CHAT_GLASS_ACCENT_OVERLAY : chatGlassOverlay(isDark)}
              >
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSend()}
                  disabled={!canSend}
                  aria-label={isEditing ? 'تأیید ویرایش' : 'ارسال'}
                  className={`composer-action-button w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                    canSend ? 'text-white' : 'text-ink-muted cursor-default'
                  }`}
                >
                  {sending ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isEditing ? (
                    <IoCheckmark size={20} />
                  ) : (
                    <IoSend size={17} />
                  )}
                </button>
              </LiquidGlass>
            )}
          </div>
          <MediaPicker
            open={showPicker}
            onClose={closePicker}
            onTabChange={setPickerTab}
            allowedTabs={allowedPickerTabs}
            onEmojiSelect={insertEmoji}
            onMediaSelect={handleMediaSelect}
            onBackspace={handleBackspace}
          />
          </div>
        )}
      </div>
    </div>
  );
}
