import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@services/notificationService';
import { chatService } from '@services/chatService';
import { formatRelativeDate } from '@utils/formatDate';
import Spinner from '@components/ui/Spinner';
import Badge from '@components/ui/Badge';
import LiquidGlass from '@components/ui/LiquidGlass';
import Modal from '@components/ui/Modal';
import { useFetch } from '@hooks/useFetch';
import { useChat } from '@context/ChatContext';
import { useTheme } from '@context/ThemeContext';
import { useSettings } from '@context/SettingsContext';
import { ROUTES } from '@constants/routes';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';
import { FiBell, FiCheck, FiInfo, FiMessageCircle, FiPhone, FiTrash2 } from 'react-icons/fi';
import { filterNotificationByPrefs } from '@utils/settingsRuntime';

function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=5BA8E8&color=fff&size=128`;
}

function groupNotifications(list) {
  const rows = Array.isArray(list) ? list : [];
  const bySenderChat = new Map();
  const rest = [];

  for (const n of rows) {
    const chatId = n.meta?.chat_id;
    const senderId = n.meta?.sender_id;
    if (n.type === 'message' && chatId != null) {
      const key = `${chatId}:${senderId ?? 'unknown'}`;
      const explicitCount = typeof n.meta?.count === 'number' ? n.meta.count : null;
      const senderName =
        n.meta?.sender_name ||
        (n.title && n.title !== 'پیام جدید' ? n.title : null) ||
        'کاربر';
      const existing = bySenderChat.get(key);

      if (!existing) {
        bySenderChat.set(key, {
          id: n.id,
          ids: [n.id],
          type: 'message',
          chatId: String(chatId),
          senderId: senderId != null ? String(senderId) : null,
          senderName,
          count: explicitCount ?? 1,
          hasExplicitCount: explicitCount != null,
          read: Boolean(n.read),
          createdAt: n.createdAt,
        });
      } else {
        existing.ids.push(n.id);
        if (explicitCount != null || existing.hasExplicitCount) {
          existing.count = Math.max(existing.count, explicitCount ?? 1);
          existing.hasExplicitCount = true;
        } else {
          existing.count += 1;
        }
        existing.read = existing.read && Boolean(n.read);
        if (n.createdAt > existing.createdAt) {
          existing.createdAt = n.createdAt;
          existing.id = n.id;
          if (n.meta?.sender_name) existing.senderName = n.meta.sender_name;
        }
      }
    } else {
      rest.push({
        id: n.id,
        ids: [n.id],
        type: n.type || 'system',
        title: n.title,
        body: n.body,
        read: Boolean(n.read),
        createdAt: n.createdAt,
        chatId: chatId != null ? String(chatId) : null,
        senderId: senderId != null ? String(senderId) : null,
        senderName: n.meta?.sender_name || n.title,
        count: 0,
      });
    }
  }

  const messages = [...bySenderChat.values()].map((item) => ({
    ...item,
    title: item.senderName,
    summary: `آقای ${item.senderName}، ${item.count.toLocaleString('fa-IR')} پیام ارسال کرده`,
  }));

  return [...messages, ...rest].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const typeMeta = {
  message: { Icon: FiMessageCircle, label: 'پیام', tint: 'from-npurple-borders/25 to-nsecondary-100/20' },
  call: { Icon: FiPhone, label: 'تماس', tint: 'from-emerald-500/20 to-teal-400/10' },
  system: { Icon: FiInfo, label: 'سیستم', tint: 'from-amber-500/20 to-orange-400/10' },
};

export default function NotificationsPage() {
  const fetchNotifications = useCallback(() => notificationService.getNotifications(), []);
  const { data, loading, refetch } = useFetch(fetchNotifications);
  const notifications = Array.isArray(data) ? data : [];
  const { selectChat, startChatWithContact } = useChat();
  const { settings } = useSettings();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [openingId, setOpeningId] = useState(null);
  const [deleteStep, setDeleteStep] = useState(0); // 0 closed, 1 first ask, 2 second ask
  const [deletingAll, setDeletingAll] = useState(false);

  const items = useMemo(() => {
    const filtered = notifications.filter((n) =>
      filterNotificationByPrefs(n, settings.notifications)
    );
    return groupNotifications(filtered);
  }, [notifications, settings.notifications]);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    refetch();
  };

  const deleteNotif = async (e, item) => {
    e.stopPropagation();
    await Promise.all(item.ids.map((id) => notificationService.deleteNotification(id)));
    refetch();
  };

  const closeDeleteModal = () => {
    if (deletingAll) return;
    setDeleteStep(0);
  };

  const confirmDeleteAll = async () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    if (deleteStep !== 2) return;

    setDeletingAll(true);
    try {
      await notificationService.deleteAllNotifications();
      setDeleteStep(0);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingAll(false);
    }
  };

  const openNotif = async (item) => {
    if (openingId) return;
    setOpeningId(item.id);
    try {
      await Promise.all(
        item.ids.map((id) => notificationService.deleteNotification(id).catch(() => {}))
      );

      if (item.type === 'message' && (item.chatId || item.senderId)) {
        const list = await chatService.getConversations();
        const conv =
          (item.chatId && list.find((c) => String(c.id) === String(item.chatId))) ||
          (item.senderId && list.find((c) => String(c.peerUserId) === String(item.senderId)));

        if (conv) {
          await selectChat(conv);
        } else if (item.senderId) {
          await startChatWithContact({ id: item.senderId, name: item.senderName });
        }
        navigate(ROUTES.HOME);
      } else {
        refetch();
      }
    } catch (err) {
      console.error(err);
      refetch();
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-28 px-3 sm:px-4 flex flex-col min-h-0 h-full">
      <div className="shrink-0 mt-3 mb-4">
        <LiquidGlass
          className="rounded-[1.35rem] shadow-lg shadow-black/10"
          contentClassName="items-center justify-between gap-3"
          {...CHAT_INPUT_GLASS}
          overlay={chatGlassOverlay(isDark)}
        >
          <div className="flex items-center justify-between w-full px-4 py-3.5 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-npurple-borders/30 to-nsecondary-100/25 border border-white/10 flex items-center justify-center shrink-0">
                <FiBell className="text-npurple-borders text-lg" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-ink text-lg font-semibold truncate">اعلانات</h1>
                  <Badge count={unreadCount} />
                </div>
                <p className="text-ink-muted text-xs mt-0.5">
                  {items.length === 0
                    ? 'هنوز اعلانی ندارید'
                    : `${items.length.toLocaleString('fa-IR')} مورد`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDeleteStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-nerror bg-nerror/10 hover:bg-nerror/15 transition-colors"
                >
                  <FiTrash2 size={14} />
                  حذف همه
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-npurple-borders bg-npurple-borders/10 hover:bg-npurple-borders/15 transition-colors"
                >
                  <FiCheck size={14} />
                  خواندن همه
                </button>
              )}
            </div>
          </div>
        </LiquidGlass>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-npurple-borders/20 to-nsecondary-100/15 border border-hairline/10 flex items-center justify-center">
              <FiBell className="text-ink-muted text-2xl" />
            </div>
            <p className="text-ink font-medium">اعلانی وجود ندارد</p>
            <p className="text-ink-muted text-sm mt-2 leading-6">
              وقتی کسی برای شما پیام بفرستد، اینجا یک خلاصه از فرستنده می‌بینید.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pb-4">
          {items.map((item, index) => {
            const meta = typeMeta[item.type] || typeMeta.system;
            const Icon = meta.Icon;
            const isMessage = item.type === 'message';
            const busy = openingId === item.id;

            return (
              <button
                key={item.ids.join('-')}
                type="button"
                onClick={() => openNotif(item)}
                disabled={busy}
                style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                className={`chat-row animate-slide-in w-full text-right px-3 py-3 relative ${
                  !item.read ? 'chat-row-active' : 'chat-row-idle'
                } ${busy ? 'opacity-70' : ''}`}
              >
                {!item.read && (
                  <span className="absolute inset-y-3 right-0 w-1 rounded-l-full bg-npurple-borders" />
                )}

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className={`rounded-2xl p-[2px] bg-gradient-to-br ${
                        !item.read
                          ? 'from-npurple-borders to-nsecondary-100'
                          : 'from-hairline/20 to-hairline/10'
                      }`}
                    >
                      {isMessage ? (
                        <img
                          src={avatarUrl(item.senderName)}
                          alt=""
                          className="w-12 h-12 rounded-[14px] object-cover bg-surface-muted"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${meta.tint} flex items-center justify-center`}
                        >
                          <Icon className="text-ink-secondary text-xl" />
                        </div>
                      )}
                    </div>
                    {isMessage && item.count > 0 && (
                      <span className="absolute -bottom-0.5 -left-0.5 min-w-[20px] h-5 px-1 rounded-full bg-npurple-borders text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-npurple-borders/30">
                        {item.count > 99 ? '۹۹+' : item.count.toLocaleString('fa-IR')}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[15px] ${
                          !item.read ? 'text-ink font-semibold' : 'text-ink font-medium'
                        }`}
                      >
                        {isMessage ? item.senderName : item.title}
                      </span>
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ${
                          !item.read ? 'text-npurple-borders' : 'text-ink-muted'
                        }`}
                      >
                        {formatRelativeDate(item.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`mt-1 text-[13px] truncate ${
                        !item.read ? 'text-ink-secondary' : 'text-ink-muted'
                      }`}
                    >
                      {isMessage ? item.summary : item.body || meta.label}
                    </p>
                  </div>

                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => deleteNotif(e, item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') deleteNotif(e, item);
                    }}
                    className="shrink-0 p-2 rounded-xl text-ink-muted hover:text-nerror hover:bg-nerror/10 transition-colors"
                    aria-label="حذف اعلان"
                  >
                    <FiTrash2 size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={deleteStep > 0}
        onClose={closeDeleteModal}
        title={deleteStep === 1 ? 'حذف همه اعلان‌ها' : 'تأیید نهایی'}
        size="sm"
      >
        <p className="text-ink-secondary text-sm leading-7 mb-6">
          {deleteStep === 1
            ? 'آیا مایل به حذف همه اعلان‌ها هستید؟'
            : 'این عمل قابل بازگشت نیست. مطمئن هستید که می‌خواهید همه اعلان‌ها را حذف کنید؟'}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={deletingAll}
            className="px-4 py-2 rounded-xl text-sm text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={confirmDeleteAll}
            disabled={deletingAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-nerror hover:bg-nerror/90 transition-colors disabled:opacity-50"
          >
            {deletingAll ? (
              <Spinner size="sm" />
            ) : (
              <>
                <FiTrash2 size={14} />
                {deleteStep === 1 ? 'بله، ادامه' : 'بله، حذف کن'}
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
