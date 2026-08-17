import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import HeaderPv from './HeaderPv';
import TypewriteBox from './TypewriteBox';
import ChatBubble from './ChatBubble';
import MessageContextMenu from './MessageContextMenu';
import ForwardModal from './ForwardModal';
import ReplyCrumpleFly from './ReplyCrumpleFly';
import MediaViewer from './MediaViewer';
import { useChat } from '@context/ChatContext';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import Spinner from '@components/ui/Spinner';
import ChatWallpaper from './ChatWallpaper';
import { config } from '@constants/config';
import { chatService } from '@services/chatService';
import { encodeForwardMessage, parseReplyMessage, parseForwardMessage, summarizeReplyText, findReplyTarget, getMessageMedia, isDownloadableMedia, defaultMediaFileName } from '../utils/messageMeta';

function captureScrollAnchor(scroller, excludeIds) {
  if (!scroller) return null;
  const scrollerTop = scroller.getBoundingClientRect().top;
  const nodes = scroller.querySelectorAll('[data-msg-id]');
  for (const node of nodes) {
    const id = node.getAttribute('data-msg-id');
    if (excludeIds?.has(id)) continue;
    const top = node.getBoundingClientRect().top;
    if (top + node.offsetHeight > scrollerTop + 8) {
      return { id, top };
    }
  }
  return null;
}

function restoreScrollAnchor(scroller, anchor) {
  if (!scroller || !anchor?.id) return;
  const node = scroller.querySelector(`[data-msg-id="${anchor.id}"]`);
  if (!node) return;
  const delta = node.getBoundingClientRect().top - anchor.top;
  if (delta !== 0) {
    scroller.scrollTop += delta;
  }
}

export default function PrivateChat() {
  const { activeChat, messages, messagesLoading, typingUsers, deleteMessage, editMessage } =
    useChat();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const chatPaneRef = useRef(null);
  const composerDockRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const suppressAutoScrollRef = useRef(false);
  const scrollAnchorRef = useRef(null);
  const stickRafRef = useRef(0);

  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, message: null });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [replyFly, setReplyFly] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardMessages, setForwardMessages] = useState([]);
  const [vanishingIds, setVanishingIds] = useState(() => new Set());
  const [burningId, setBurningId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [highlightKey, setHighlightKey] = useState(0);
  const [viewerMedia, setViewerMedia] = useState(null);
  const highlightClearRef = useRef(null);

  const cancelStickRaf = useCallback(() => {
    if (stickRafRef.current) {
      cancelAnimationFrame(stickRafRef.current);
      stickRafRef.current = 0;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    suppressAutoScrollRef.current = false;
    scrollAnchorRef.current = null;
    const jump = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    jump();
    cancelStickRaf();
    stickRafRef.current = requestAnimationFrame(() => {
      jump();
      stickRafRef.current = requestAnimationFrame(jump);
    });
  }, [cancelStickRaf]);

  useEffect(() => {
    setMenu({ open: false, x: 0, y: 0, message: null });
    setSelectionMode(false);
    setSelectedIds(new Set());
    setReplyTo(null);
    setReplyFly(null);
    setForwardOpen(false);
    setForwardMessages([]);
    setVanishingIds(new Set());
    setBurningId(null);
    setEditingMessage(null);
    setScrollLocked(false);
    setHighlightId(null);
    setViewerMedia(null);
    if (highlightClearRef.current) {
      highlightClearRef.current();
      highlightClearRef.current = null;
    }
    prevMessageCountRef.current = 0;
    suppressAutoScrollRef.current = false;
    scrollAnchorRef.current = null;
    cancelStickRaf();
  }, [activeChat?.id, cancelStickRaf]);

  // Keep a visible message glued in place while delete animates / removes
  useLayoutEffect(() => {
    if (!scrollLocked) return;
    restoreScrollAnchor(messagesScrollRef.current, scrollAnchorRef.current);
  }, [scrollLocked, messages, vanishingIds, selectionMode]);

  useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;

    const prevCount = prevMessageCountRef.current;
    const nextCount = messages.length;
    const grew = nextCount > prevCount;
    prevMessageCountRef.current = nextCount;

    if (suppressAutoScrollRef.current || scrollLocked) {
      cancelStickRaf();
      restoreScrollAnchor(scroller, scrollAnchorRef.current);
      return;
    }

    if (!grew) return;

    const stickToBottom = () => {
      if (suppressAutoScrollRef.current || scrollLocked) return;
      scroller.scrollTop = scroller.scrollHeight;
    };

    stickToBottom();
    cancelStickRaf();
    stickRafRef.current = requestAnimationFrame(() => {
      stickToBottom();
      stickRafRef.current = requestAnimationFrame(stickToBottom);
    });
  }, [messages, messagesLoading, scrollLocked, cancelStickRaf]);

  useLayoutEffect(() => {
    const pane = chatPaneRef.current;
    const composer = composerDockRef.current;
    if (!pane || !composer) return undefined;

    const syncComposerHeight = () => {
      pane.style.setProperty('--composer-height', `${Math.ceil(composer.getBoundingClientRect().height)}px`);
    };

    syncComposerHeight();
    const observer = new ResizeObserver(syncComposerHeight);
    observer.observe(composer);

    // Mobile keyboard opening shrinks the visual viewport; keep the latest
    // messages visible instead of leaving them behind the keyboard.
    const onViewportResize = () => {
      syncComposerHeight();
      if (composer.contains(document.activeElement)) scrollToBottom();
    };
    window.visualViewport?.addEventListener('resize', onViewportResize);

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, [activeChat?.id, scrollToBottom]);

  const messagesById = useMemo(() => {
    const map = new Map();
    (messages || []).forEach((m) => map.set(String(m.id), m));
    return map;
  }, [messages]);

  const selectedList = useMemo(
    () =>
      [...selectedIds]
        .map((id) => messagesById.get(String(id)))
        .filter(Boolean),
    [selectedIds, messagesById]
  );

  const authorOf = useCallback(
    (msg) => {
      if (!msg) return 'پیام';
      if (msg.senderId === 'me') return 'شما';
      return activeChat?.name || 'مخاطب';
    },
    [activeChat?.name]
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSelectionMode(next.size > 0);
      return next;
    });
  }, []);

  const openMenu = useCallback(({ message, x, y }) => {
    if (selectionMode) {
      toggleSelect(message.id);
      return;
    }
    setMenu({ open: true, x, y, message });
  }, [selectionMode, toggleSelect]);

  const closeMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false }));
  }, []);

  const copyTexts = useCallback(
    async (msgs) => {
      const text = msgs
        .map((m) => {
          const { text: t1 } = parseReplyMessage(m.text);
          const { text: t2 } = parseForwardMessage(t1);
          return t2 || '';
        })
        .filter(Boolean)
        .join('\n\n');
      if (!text) {
        addToast('متنی برای کپی نیست', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        addToast('کپی شد', 'success');
      } catch {
        addToast('کپی ناموفق بود', 'error');
      }
    },
    [addToast]
  );

  const jumpToMessage = useCallback((previewOrId) => {
    const preview =
      previewOrId && typeof previewOrId === 'object'
        ? previewOrId
        : { id: previewOrId };

    const targetMsg = findReplyTarget(messages, preview);
    const messageId = targetMsg ? String(targetMsg.id) : preview.id ? String(preview.id) : null;

    if (!messageId) {
      addToast('پیام اصلی پیدا نشد', 'error');
      return;
    }

    const scroller = messagesScrollRef.current;
    const target = scroller?.querySelector(`[data-msg-id="${messageId}"]`);
    if (!target || !scroller) {
      addToast('پیام اصلی پیدا نشد', 'error');
      return;
    }

    if (highlightClearRef.current) {
      highlightClearRef.current();
      highlightClearRef.current = null;
    }

    suppressAutoScrollRef.current = true;
    cancelStickRaf();

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop =
      scroller.scrollTop +
      (targetRect.top - scrollerRect.top) -
      scroller.clientHeight * 0.35;

    scroller.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth',
    });

    // Highlight after scroll starts so the pulse is visible on-screen
    setHighlightId(null);
    window.setTimeout(() => {
      setHighlightId(messageId);
      setHighlightKey((k) => k + 1);
    }, 280);

    // Clear only on real user interaction — not programmatic smooth-scroll
    let cleanup = () => {};

    const onUserIntent = () => {
      setHighlightId(null);
      suppressAutoScrollRef.current = false;
      cleanup();
    };

    cleanup = () => {
      scroller.removeEventListener('wheel', onUserIntent);
      scroller.removeEventListener('touchstart', onUserIntent);
      scroller.removeEventListener('pointerdown', onUserIntent);
      if (highlightClearRef.current === cleanup) {
        highlightClearRef.current = null;
      }
    };

    highlightClearRef.current = cleanup;
    // Arm after smooth scroll settles so the jump itself doesn't clear highlight
    window.setTimeout(() => {
      if (highlightClearRef.current !== cleanup) return;
      scroller.addEventListener('wheel', onUserIntent, { passive: true });
      scroller.addEventListener('touchstart', onUserIntent, { passive: true });
      scroller.addEventListener('pointerdown', onUserIntent, { passive: true });
    }, 550);
  }, [messages, addToast, cancelStickRaf]);

  const startReply = useCallback(
    (msg) => {
      const { text: t1 } = parseReplyMessage(msg.text);
      const { text: body } = parseForwardMessage(t1);
      const payload = {
        id: msg.id,
        text: summarizeReplyText(body || ''),
        author: authorOf(msg),
      };

      clearSelection();
      setEditingMessage(null);
      setMenu((m) => ({ ...m, open: false }));

      const bubble = document.querySelector(`[data-msg-id="${String(msg.id)}"]`);
      const fromEl = bubble?.querySelector('.msg-mine, .msg-other') || bubble;
      const from = fromEl?.getBoundingClientRect();

      if (from && from.width > 0) {
        setReplyTo(null);
        setReplyFly({
          from: {
            left: from.left,
            top: from.top,
            width: from.width,
            height: from.height,
          },
          to: null,
          text: payload.text,
          author: payload.author,
          isMe: msg.senderId === 'me',
          payload,
        });
      } else {
        setReplyTo(payload);
      }
    },
    [authorOf, clearSelection]
  );

  const handleReplyFlyDone = useCallback(() => {
    setReplyFly((current) => {
      if (current?.payload) setReplyTo(current.payload);
      return null;
    });
  }, []);

  const startEdit = useCallback(
    (msg) => {
      if (!msg || msg.senderId !== 'me') {
        addToast('فقط پیام‌های خودتان قابل ویرایش است', 'error');
        return;
      }
      const { text: afterReply, replyPreview } = parseReplyMessage(msg.text);
      const { text: body, forwarded } = parseForwardMessage(afterReply);
      setReplyTo(null);
      setReplyFly(null);
      clearSelection();
      // No special animation when entering edit mode
      setEditingMessage({
        id: msg.id,
        body,
        preview: summarizeReplyText(body),
        replyPreview,
        forwarded,
      });
    },
    [addToast, clearSelection]
  );

  const confirmEdit = useCallback(
    async (payload, meta) => {
      if (!meta?.id) return;
      setBurningId(String(meta.id));
      await new Promise((r) => setTimeout(r, 680));
      try {
        await editMessage(meta.id, payload);
      } catch (err) {
        setBurningId(null);
        throw err;
      }
      setBurningId(null);
    },
    [editMessage]
  );

  const openForward = useCallback((msgs) => {
    setForwardMessages(msgs.filter((m) => m?.text));
    setForwardOpen(true);
  }, []);

  const deleteMsgs = useCallback(
    async (msgs) => {
      const mine = msgs.filter((m) => m.senderId === 'me');
      if (mine.length === 0) {
        addToast('فقط پیام‌های خودتان قابل حذف است', 'error');
        return;
      }

      const ids = mine.map((m) => String(m.id));
      const exclude = new Set(ids);
      const scroller = messagesScrollRef.current;

      cancelStickRaf();
      suppressAutoScrollRef.current = true;
      scrollAnchorRef.current = captureScrollAnchor(scroller, exclude);
      setScrollLocked(true);

      clearSelection();
      setMenu((m) => ({ ...m, open: false }));

      setVanishingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      const animMs = 720 + Math.min(mine.length - 1, 4) * 55;
      await new Promise((r) => setTimeout(r, animMs));

      await Promise.all(mine.map((m) => deleteMessage(m.id)));

      setVanishingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

      // Re-anchor after DOM removal, then unlock
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      restoreScrollAnchor(messagesScrollRef.current, scrollAnchorRef.current);

      setScrollLocked(false);
      scrollAnchorRef.current = null;
      suppressAutoScrollRef.current = false;

      if (mine.length < msgs.length) {
        addToast('فقط پیام‌های شما حذف شد', 'success');
      }
    },
    [deleteMessage, addToast, clearSelection, cancelStickRaf]
  );

  const downloadMediaMessage = useCallback(
    async (msg) => {
      const media = getMessageMedia(msg?.text);
      if (!isDownloadableMedia(media)) {
        addToast('فایلی برای دانلود نیست', 'error');
        return;
      }
      try {
        const res = await fetch(media.url, { credentials: 'include' });
        if (!res.ok) throw new Error('دانلود ناموفق بود');
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = defaultMediaFileName(media);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        addToast(err?.message || 'دانلود ناموفق بود', 'error');
      }
    },
    [addToast]
  );

  const handleMenuAction = useCallback(
    (action, message) => {
      if (!message) return;
      switch (action) {
        case 'reply':
          startReply(message);
          break;
        case 'edit':
          startEdit(message);
          break;
        case 'download':
          downloadMediaMessage(message);
          break;
        case 'forward':
          openForward([message]);
          break;
        case 'copy':
          copyTexts([message]);
          break;
        case 'select':
          setSelectionMode(true);
          setSelectedIds(new Set([String(message.id)]));
          break;
        case 'delete':
          deleteMsgs([message]);
          break;
        default:
          break;
      }
    },
    [startReply, startEdit, downloadMediaMessage, openForward, copyTexts, deleteMsgs]
  );

  const handleForwardPick = useCallback(
    async (conv) => {
      if (!conv || forwardMessages.length === 0) return;
      try {
        for (const msg of forwardMessages) {
          const { text: t1 } = parseReplyMessage(msg.text);
          const { text: body } = parseForwardMessage(t1);
          await chatService.sendMessage(conv.id, encodeForwardMessage(body));
        }
        addToast(`به ${conv.name} فوروارد شد`, 'success');
        setForwardOpen(false);
        setForwardMessages([]);
        clearSelection();
      } catch (err) {
        addToast(err?.message || 'فوروارد ناموفق بود', 'error');
      }
    },
    [forwardMessages, addToast, clearSelection]
  );

  return (
    <div
      ref={chatPaneRef}
      className="chat-pane flex flex-col flex-1 chat-bg-messages min-w-0 relative overflow-hidden"
      data-autoplay-gifs={settings.chat.autoPlayGifs !== false ? '1' : '0'}
      data-autoplay-videos={settings.chat.autoPlayVideos ? '1' : '0'}
      data-less-data={settings.data?.useLessData ? '1' : '0'}
    >
      <ChatWallpaper />

      {!activeChat ? (
        <div className="flex-1 flex items-center justify-center relative z-10 px-6 pt-20">
          <div className="max-w-sm rounded-2xl border border-hairline/[0.08] bg-[rgb(var(--surface-panel))]/90 px-7 py-10 text-center">
            <div className="mx-auto mb-4 w-11 h-11 rounded-xl bg-surface-muted border border-hairline/[0.08] flex items-center justify-center text-xl text-ink-muted">
              ◌
            </div>
            <p className="text-ink text-base font-medium">به {config.appName} خوش آمدید</p>
            <p className="text-ink-muted text-sm mt-2 leading-6">
              یک گفتگو از لیست انتخاب کنید یا با دکمه + گفتگوی جدید بسازید.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          <div
            ref={messagesScrollRef}
            className="messages-scroller absolute inset-0 overflow-y-auto px-3 sm:px-5 z-10 pt-2"
          >
            <div className="sticky top-0 z-30 -mx-3 sm:-mx-5 px-3 sm:px-5 pointer-events-none">
              <div className="pointer-events-auto">
                <HeaderPv
                  selectionMode={selectionMode}
                  selectedCount={selectedIds.size}
                  onClearSelection={clearSelection}
                  onCopySelected={() => copyTexts(selectedList)}
                  onReplySelected={() => {
                    if (selectedList[0]) startReply(selectedList[0]);
                  }}
                  onForwardSelected={() => openForward(selectedList)}
                  onDeleteSelected={() => deleteMsgs(selectedList)}
                  onJumpToMessage={jumpToMessage}
                  onClearHighlight={() => setHighlightId(null)}
                />
              </div>
            </div>

            {messagesLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full min-h-[240px] flex items-center justify-center">
                <div className="text-center rounded-2xl border border-dashed border-hairline/15 bg-surface-muted/40 px-6 py-8">
                  <p className="text-ink font-medium">شروع گفتگو</p>
                  <p className="text-sm text-ink-muted mt-2">
                    اولین پیام را برای {activeChat.name} ارسال کنید
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`max-w-3xl mx-auto ${
                  settings.chat.distanceBetweenBubbles === 'compact'
                    ? 'space-y-1.5'
                    : settings.chat.distanceBetweenBubbles === 'relaxed'
                      ? 'space-y-5'
                      : 'space-y-3'
                }`}
              >
                {messages.map((msg) => {
                  const id = String(msg.id);
                  const vanishing = vanishingIds.has(id);
                  const vanishDelay = vanishing
                    ? Math.min(
                        messages
                          .filter((m) => vanishingIds.has(String(m.id)))
                          .findIndex((m) => String(m.id) === id),
                        4
                      ) * 70
                    : 0;
                  return (
                    <ChatBubble
                      key={highlightId === id ? `${msg.id}-h${highlightKey}` : msg.id}
                      message={msg}
                      selected={selectedIds.has(id)}
                      selectionMode={selectionMode}
                      vanishing={vanishing}
                      vanishDelay={vanishDelay}
                      burning={burningId === id}
                      highlighted={highlightId === id}
                      onOpenMenu={openMenu}
                      onToggleSelect={toggleSelect}
                      onJumpToReply={jumpToMessage}
                      onOpenMedia={setViewerMedia}
                    />
                  );
                })}

                {typingUsers[activeChat.id] && (
                  <div className="flex justify-end">
                    <div className="msg-other px-4 py-3 rounded-[1.15rem] rounded-bl-md">
                      <div className="flex gap-1.5 items-center h-4">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>

          <div
            ref={composerDockRef}
            className="composer-dock absolute inset-x-0 bottom-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto">
              <TypewriteBox
                replyTo={replyTo}
                replyLanding={Boolean(replyFly)}
                onClearReply={() => setReplyTo(null)}
                onJumpToReply={jumpToMessage}
                editingMessage={editingMessage}
                onClearEdit={() => setEditingMessage(null)}
                onConfirmEdit={confirmEdit}
                onSent={scrollToBottom}
              />
            </div>
          </div>
        </div>
      )}

      {replyFly && (
        <ReplyCrumpleFly
          from={replyFly.from}
          to={replyFly.to}
          text={replyFly.text}
          author={replyFly.author}
          isMe={replyFly.isMe}
          onDone={handleReplyFlyDone}
        />
      )}

      <MediaViewer media={viewerMedia} onClose={() => setViewerMedia(null)} />

      <MessageContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        message={menu.message}
        canDelete={menu.message?.senderId === 'me'}
        onAction={handleMenuAction}
        onClose={closeMenu}
      />

      <ForwardModal
        isOpen={forwardOpen}
        onClose={() => {
          setForwardOpen(false);
          setForwardMessages([]);
        }}
        onPick={handleForwardPick}
        messageCount={forwardMessages.length}
      />
    </div>
  );
}
