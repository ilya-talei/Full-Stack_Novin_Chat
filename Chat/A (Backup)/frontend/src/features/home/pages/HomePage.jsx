import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '@hooks/useDebounce';
import { useChat } from '@context/ChatContext';
import { useToast } from '@components/ui/Toast';
import ChatList from '@/features/chat/components/ChatList';
import ChatActionMenu from '@/features/chat/components/ChatActionMenu';
import CreateGroupModal from '@/features/chat/components/CreateGroupModal';
import CreateChannelModal from '@/features/chat/components/CreateChannelModal';
import NewChatModal from '@/features/chat/components/NewChatModal';
import Skeleton from '@components/ui/Skeleton';
import DynamicIsland from '@components/ui/DynamicIsland';
import { useTheme } from '@context/ThemeContext';
import { useSettings } from '@context/SettingsContext';
import { ROUTES } from '@constants/routes';
import { config } from '@constants/config';

const PAGE_TITLES = {
  [ROUTES.HOME]: 'گفتگوها',
  [ROUTES.PERSONAL]: 'شخصی',
  [ROUTES.GROUPS]: 'گروه‌ها',
  [ROUTES.CHANNELS]: 'کانال‌ها',
};

const ROUTE_BY_FOLDER = {
  all: ROUTES.HOME,
  personal: ROUTES.PERSONAL,
  groups: ROUTES.GROUPS,
  channels: ROUTES.CHANNELS,
  unread: ROUTES.HOME,
};

const FALLBACK_FOLDERS = [
  { id: 'all', title: 'همه' },
  { id: 'unread', title: 'خوانده‌نشده' },
  { id: 'personal', title: 'شخصی' },
  { id: 'groups', title: 'گروه‌ها' },
  { id: 'channels', title: 'کانال‌ها' },
];

function FolderChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] transition-colors ${
        active
          ? 'bg-npurple-borders/15 text-npurple-borders font-semibold'
          : 'text-ink-muted hover:text-ink hover:bg-black/4 dark:hover:bg-white/6'
      }`}
    >
      {label}
    </button>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('all');
  const [modals, setModals] = useState({ chat: false, group: false, channel: false });
  const debouncedSearch = useDebounce(search, 300);
  const {
    conversations,
    loadConversations,
    loading,
    selectChat,
    activeChat,
    createGroup,
    createChannel,
    startChatWithContact,
  } = useChat();
  const { addToast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (location.pathname === ROUTES.PERSONAL) setFolderId('personal');
    else if (location.pathname === ROUTES.GROUPS) setFolderId('groups');
    else if (location.pathname === ROUTES.CHANNELS) setFolderId('channels');
    else if (location.pathname === ROUTES.HOME && ['personal', 'groups', 'channels'].includes(folderId)) {
      setFolderId('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const folders = useMemo(() => {
    const items = settings.folders?.items;
    if (Array.isArray(items) && items.length > 0) {
      const mapped = items.map((f) => ({ id: f.id, title: f.title }));
      if (!mapped.some((f) => f.id === 'channels')) {
        mapped.push({ id: 'channels', title: 'کانال‌ها' });
      }
      return mapped;
    }
    return FALLBACK_FOLDERS;
  }, [settings.folders]);

  const pageTitle =
    folders.find((f) => f.id === folderId)?.title ||
    PAGE_TITLES[location.pathname] ||
    PAGE_TITLES[ROUTES.HOME];

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !debouncedSearch ||
      c.name.includes(debouncedSearch) ||
      c.lastMessage.includes(debouncedSearch);

    let matchesFolder = true;
    if (folderId === 'personal') matchesFolder = c.type === 'personal';
    else if (folderId === 'groups') matchesFolder = c.type === 'groups';
    else if (folderId === 'channels') matchesFolder = c.type === 'channels';
    else if (folderId === 'unread') matchesFolder = (c.unread || 0) > 0;
    else if (String(folderId).startsWith('f_')) {
      const folder = (settings.folders?.items || []).find((f) => f.id === folderId);
      const ids = folder?.chatIds || [];
      matchesFolder = ids.includes(c.id);
    }

    return matchesSearch && matchesFolder;
  });

  const handleCreateGroup = async (data) => {
    try {
      await createGroup(data);
      setModals((m) => ({ ...m, group: false }));
      addToast('گروه ایجاد شد', 'success');
      navigate(ROUTES.GROUPS);
    } catch {
      addToast('خطا در ایجاد گروه', 'error');
    }
  };

  const handleCreateChannel = async (data) => {
    try {
      await createChannel(data);
      setModals((m) => ({ ...m, channel: false }));
      addToast('کانال ایجاد شد', 'success');
      navigate(ROUTES.CHANNELS);
    } catch {
      addToast('خطا در ایجاد کانال', 'error');
    }
  };

  const handleStartChat = async (contact) => {
    try {
      await startChatWithContact(contact);
      addToast(`گفتگو با ${contact.name} شروع شد`, 'success');
    } catch {
      addToast('خطا در شروع گفتگو', 'error');
    }
  };

  const selectFolder = (id) => {
    setFolderId(id);
    const route = ROUTE_BY_FOLDER[id];
    if (route && route !== location.pathname && id !== 'unread' && id !== 'all') {
      navigate(route);
    } else if ((id === 'all' || id === 'unread') && location.pathname !== ROUTES.HOME) {
      navigate(ROUTES.HOME);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col pb-4">
      <div className="sticky top-0 z-20 px-3 sm:px-4 pt-2.5 pb-2 bg-gradient-to-b from-[rgb(var(--surface-app))] via-[rgb(var(--surface-app))]/92 to-transparent">
        <DynamicIsland
          title={pageTitle}
          subtitle={config.appName}
          countLabel={filtered.length.toLocaleString('fa-IR')}
          search={search}
          onSearchChange={setSearch}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <div className="mt-3 flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0.5">
          {folders.map((folder) => (
            <FolderChip
              key={folder.id}
              label={folder.title}
              active={folderId === folder.id}
              onClick={() => selectFolder(folder.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-1 mx-1 flex-1">
        {loading && conversations.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-ink font-medium">
              {debouncedSearch ? 'نتیجه‌ای یافت نشد' : 'گفتگویی وجود ندارد'}
            </p>
            <p className="text-ink-muted text-sm mt-2 leading-relaxed">
              با دکمه + در پایین، گفتگو، گروه یا کانال جدید بسازید
            </p>
          </div>
        ) : (
          <ChatList
            conversations={filtered}
            activeChat={activeChat}
            onSelect={selectChat}
          />
        )}
      </div>

      <ChatActionMenu
        onNewChat={() => setModals((m) => ({ ...m, chat: true }))}
        onNewGroup={() => setModals((m) => ({ ...m, group: true }))}
        onNewChannel={() => setModals((m) => ({ ...m, channel: true }))}
      />

      <NewChatModal
        isOpen={modals.chat}
        onClose={() => setModals((m) => ({ ...m, chat: false }))}
        onSelectContact={handleStartChat}
      />
      <CreateGroupModal
        isOpen={modals.group}
        onClose={() => setModals((m) => ({ ...m, group: false }))}
        onSubmit={handleCreateGroup}
        loading={loading}
      />
      <CreateChannelModal
        isOpen={modals.channel}
        onClose={() => setModals((m) => ({ ...m, channel: false }))}
        onSubmit={handleCreateChannel}
        loading={loading}
      />
    </div>
  );
}
