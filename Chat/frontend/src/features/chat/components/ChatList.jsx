import { useSettings } from '@context/SettingsContext';

const TYPE_META = {
  groups: {
    label: 'گروه',
    avatarClass: 'rounded-[14px]',
    chipClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  },
  channels: {
    label: 'کانال',
    avatarClass: 'rounded-[12px]',
    chipClass: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
  },
  personal: {
    label: null,
    avatarClass: 'rounded-full',
  },
};

export default function ChatList({ conversations, activeChat, onSelect }) {
  const { settings } = useSettings();
  const showUnreadCount = settings.notifications?.countUnread !== false;

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const isActive = activeChat?.id === conv.id;
        const hasUnread = showUnreadCount && conv.unread > 0;
        const meta = TYPE_META[conv.type] || TYPE_META.personal;

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv)}
            className={`chat-row w-full text-right px-2.5 py-2.5 ${
              isActive ? 'chat-row-active' : 'chat-row-idle'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={conv.avatar}
                  alt={conv.name}
                  className={`w-12 h-12 object-cover bg-surface-muted ${meta.avatarClass}`}
                />
                {conv.online && conv.type === 'personal' && (
                  <span className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-nsuccess border-2 border-[rgb(var(--surface-app))]" />
                )}
              </div>

              <div className="flex-1 min-w-0 border-b border-hairline/[0.06] pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`truncate text-[15px] ${
                        hasUnread ? 'text-ink font-semibold' : 'text-ink font-medium'
                      }`}
                    >
                      {conv.name}
                    </span>
                    {meta.label ? (
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium leading-none ${meta.chipClass}`}
                      >
                        {meta.label}
                      </span>
                    ) : null}
                  </div>

                  <span
                    className={`text-[11px] tabular-nums shrink-0 ${
                      hasUnread ? 'text-npurple-borders' : 'text-ink-muted'
                    }`}
                  >
                    {conv.date || ''}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p
                    className={`text-[13px] truncate ${
                      hasUnread ? 'text-ink-secondary' : 'text-ink-muted'
                    }`}
                  >
                    {conv.lastMessage || 'هنوز پیامی نیست'}
                  </p>
                  {hasUnread ? (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-npurple-borders text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread > 99 ? '99+' : conv.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
