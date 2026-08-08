import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAtSign,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiCopy,
  FiCornerUpLeft,
  FiInfo,
  FiMoreVertical,
  FiPhone,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useChat } from '@context/ChatContext';
import { useCall } from '@context/CallContext';
import { useTheme } from '@context/ThemeContext';
import { usePerformance } from '@context/PerformanceContext';
import LiquidGlass from '@components/ui/LiquidGlass';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';
import { profileService } from '@services/notificationService';
import { formatLastSeenStatus } from '@utils/formatDate';
import { getSearchableText } from '../utils/messageMeta';

function getSubtitle(conversation, typing, nowTs) {
  if (!conversation) return 'در حال اتصال...';
  if (typing) return 'در حال نوشتن...';

  if (conversation.type === 'groups') {
    return `${conversation.memberCount ?? 0} عضو`;
  }

  if (conversation.type === 'channels') {
    return `${conversation.subscriberCount ?? 0} مشترک`;
  }

  return formatLastSeenStatus(conversation.lastSeenAt, Boolean(conversation.online), nowTs);
}

function presenceMode(conversation, typing) {
  if (typing) return 'typing';
  if (conversation?.online && conversation?.type === 'personal') return 'online';
  return 'idle';
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
  return (parts[0] || '؟').slice(0, 2);
}

function InfoRow({ icon: Icon, label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="pvi-info-row">
      <span className="pvi-info-ico" aria-hidden>
        <Icon size={13} />
      </span>
      <div className="pvi-info-row-text">
        <span className="pvi-info-label">{label}</span>
        <span className="pvi-info-value">{value}</span>
      </div>
    </div>
  );
}

function SelectIslandBody({
  count,
  canReply,
  onCopy,
  onReply,
  onForward,
  onDelete,
  onClear,
  phase = 'in',
}) {
  return (
    <div className={`pvi-select ${phase === 'out' ? 'is-out' : 'is-in'}`} dir="ltr">
      <span className="pvi-select-sheen" aria-hidden />
      <div className="pvi-select-actions">
        <button
          type="button"
          className="pvi-select-btn pvi-select-btn--danger"
          onClick={onDelete}
          aria-label="حذف"
          title="حذف"
          style={{ '--i': 0 }}
        >
          <span className="pvi-select-btn__ico">
            <FiTrash2 size={18} />
          </span>
        </button>
        <button
          type="button"
          className="pvi-select-btn"
          onClick={onCopy}
          aria-label="کپی"
          title="کپی"
          style={{ '--i': 1 }}
        >
          <span className="pvi-select-btn__ico">
            <FiCopy size={17} />
          </span>
        </button>
        <button
          type="button"
          className="pvi-select-btn"
          onClick={onForward}
          aria-label="فوروارد"
          title="فوروارد"
          style={{ '--i': 2 }}
        >
          <span className="pvi-select-btn__ico">
            <FiShare2 size={17} />
          </span>
        </button>
        {canReply ? (
          <button
            type="button"
            className="pvi-select-btn"
            onClick={onReply}
            aria-label="ریپلای"
            title="ریپلای"
            style={{ '--i': 3 }}
          >
            <span className="pvi-select-btn__ico">
              <FiCornerUpLeft size={17} />
            </span>
          </button>
        ) : null}
      </div>

      <div className="pvi-select-meta">
        <span className="pvi-select-count" dir="rtl">
          <span className="pvi-select-count__n">
            {Number(count || 0).toLocaleString('fa-IR')}
          </span>
          <span className="pvi-select-count__t">انتخاب‌شده</span>
        </span>
        <button
          type="button"
          className="pvi-select-btn"
          onClick={onClear}
          aria-label="لغو انتخاب"
          title="لغو"
          style={{ '--i': 0 }}
        >
          <span className="pvi-select-btn__ico">
            <FiX size={18} />
          </span>
        </button>
      </div>
    </div>
  );
}

function IslandBody({
  view,
  mode,
  chat,
  name,
  avatar,
  subtitle,
  profile,
  profileLoading,
  searchQuery,
  searchMatchLabel,
  searchHasMatches,
  searchInputRef,
  onExpand,
  onCollapse,
  onInfo,
  onSearch,
  onCall,
  canCall = false,
  onBackToMenu,
  onSearchQueryChange,
  onSearchPrev,
  onSearchNext,
}) {
  const initials = getInitials(name);
  const isCompact = view === 'compact';
  const isMenu = view === 'menu';
  const isInfo = view === 'info';
  const isSearch = view === 'search';

  const infoName = profile?.name || name;
  const infoAvatar = profile?.avatar || avatar;
  const infoInitials = getInitials(infoName);
  const username = profile?.username || chat?.username || chat?.raw?.login_id || '';
  const bio = profile?.bio || chat?.description || '';
  const phone = profile?.phone || null;
  const infoStatus =
    chat?.type === 'personal'
      ? formatLastSeenStatus(profile?.lastSeenAt || chat?.lastSeenAt, Boolean(chat?.online))
      : chat?.type === 'groups'
        ? `${chat.memberCount ?? 0} عضو`
        : chat?.type === 'channels'
          ? `${chat.subscriberCount ?? 0} مشترک`
          : subtitle;

  return (
    <div className="pvi-shell">
      <button
        type="button"
        className={`pvi-layer pvi-compact ${isCompact ? 'is-on' : 'is-off'}`}
        onClick={onExpand}
        tabIndex={isCompact ? 0 : -1}
        aria-hidden={!isCompact}
        aria-label="باز کردن هدر گفتگو"
      >
        <span className={`pvi-avatar pvi-avatar--sm is-${mode}`}>
          {avatar ? <img src={avatar} alt="" /> : <span>{initials.slice(0, 1)}</span>}
          {mode === 'online' ? <i className="pvi-dot" /> : null}
        </span>

        <span className="pvi-compact-meta">
          <span className="pvi-compact-name">{name}</span>
          <span className="pvi-compact-sub">{subtitle}</span>
        </span>

        {mode === 'typing' ? (
          <span className="pvi-eq" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : mode === 'online' ? (
          <span className="pvi-live" aria-hidden>
            <span className="pvi-live-ring" />
            <span className="pvi-live-core" />
          </span>
        ) : (
          <span className="pvi-idle-pulse" aria-hidden />
        )}
      </button>

      <div
        className={`pvi-layer pvi-expanded ${isMenu ? 'is-on' : 'is-off'}`}
        aria-hidden={!isMenu}
      >
        <div className="pvi-expanded-head">
          <div className="pvi-identity">
            <span className={`pvi-avatar pvi-avatar--lg is-${mode}`}>
              {avatar ? <img src={avatar} alt="" /> : <span>{initials}</span>}
              {mode === 'online' ? <i className="pvi-dot" /> : null}
            </span>
            <div className="pvi-identity-text">
              <p className="pvi-name">{name}</p>
              <p className={`pvi-status is-${mode}`}>{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="pvi-expanded-mid">
          {mode === 'typing' ? (
            <div className="pvi-activity is-typing">
              <span className="pvi-eq pvi-eq--lg" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>در حال نوشتن پیام...</span>
            </div>
          ) : mode === 'online' ? (
            <div className="pvi-activity is-online">
              <span className="pvi-live pvi-live--lg" aria-hidden>
                <span className="pvi-live-ring" />
                <span className="pvi-live-core" />
              </span>
              <span>همین الان آنلاین است</span>
            </div>
          ) : (
            <div className="pvi-activity is-idle">
              <span className="pvi-idle-bar" aria-hidden />
              <span>{subtitle}</span>
            </div>
          )}
        </div>

        <div className="pvi-actions pvi-actions--dock">
          {canCall ? (
            <button
              type="button"
              className="pvi-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCall?.();
              }}
              aria-label="تماس"
              title="تماس"
              tabIndex={isMenu ? 0 : -1}
            >
              <FiPhone size={15} />
            </button>
          ) : null}
          <button
            type="button"
            className="pvi-btn"
            onClick={(e) => {
              e.stopPropagation();
              onInfo?.();
            }}
            aria-label="اطلاعات"
            tabIndex={isMenu ? 0 : -1}
          >
            <FiInfo size={16} />
          </button>
          <button
            type="button"
            className="pvi-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSearch?.();
            }}
            aria-label="جستجو"
            tabIndex={isMenu ? 0 : -1}
          >
            <FiSearch size={15} />
          </button>
          <button type="button" className="pvi-btn" aria-label="بیشتر" tabIndex={isMenu ? 0 : -1}>
            <FiMoreVertical size={15} />
          </button>
          <button
            type="button"
            className="pvi-btn pvi-btn--mute"
            onClick={onCollapse}
            aria-label="جمع کردن"
            tabIndex={isMenu ? 0 : -1}
          >
            <FiX size={15} />
          </button>
        </div>
      </div>

      <div className={`pvi-layer pvi-info ${isInfo ? 'is-on' : 'is-off'}`} aria-hidden={!isInfo}>
        <div className="pvi-info-top">
          <span className={`pvi-avatar pvi-avatar--xl is-${mode}`}>
            {infoAvatar ? <img src={infoAvatar} alt="" /> : <span>{infoInitials}</span>}
            {mode === 'online' ? <i className="pvi-dot" /> : null}
          </span>
          <div className="pvi-info-head-text">
            <p className="pvi-info-title">{infoName}</p>
            <p className={`pvi-info-sub is-${mode}`}>{infoStatus}</p>
            {profileLoading ? <p className="pvi-info-loading">در حال بارگذاری...</p> : null}
          </div>
          <button
            type="button"
            className="pvi-btn pvi-btn--mute"
            onClick={onCollapse}
            aria-label="بستن"
            tabIndex={isInfo ? 0 : -1}
          >
            <FiX size={15} />
          </button>
        </div>

        <div className="pvi-info-card">
          {chat?.type === 'personal' ? (
            <>
              <InfoRow icon={FiAtSign} label="نام کاربری" value={username ? `@${username}` : null} />
              <InfoRow icon={FiPhone} label="شماره تماس" value={phone} />
              <InfoRow icon={FiInfo} label="بیو" value={bio} />
            </>
          ) : (
            <>
              <InfoRow
                icon={FiUsers}
                label={chat?.type === 'channels' ? 'مشترکین' : 'اعضا'}
                value={String(
                  chat?.type === 'channels'
                    ? chat?.subscriberCount ?? chat?.memberCount ?? 0
                    : chat?.memberCount ?? 0
                )}
              />
              <InfoRow icon={FiInfo} label="توضیحات" value={bio} />
            </>
          )}
        </div>

        <div className="pvi-actions pvi-actions--dock">
          <button
            type="button"
            className="pvi-btn"
            onClick={onBackToMenu}
            aria-label="بازگشت به منو"
            tabIndex={isInfo ? 0 : -1}
          >
            <FiChevronRight size={16} />
          </button>
          <button
            type="button"
            className="pvi-btn pvi-btn--mute"
            onClick={onCollapse}
            aria-label="جمع کردن"
            tabIndex={isInfo ? 0 : -1}
          >
            <FiX size={15} />
          </button>
        </div>
      </div>

      <div
        className={`pvi-layer pvi-search ${isSearch ? 'is-on' : 'is-off'}`}
        aria-hidden={!isSearch}
      >
        <div className="pvi-search-top">
          <label className="pvi-search-field">
            <FiSearch size={14} className="pvi-search-ico" aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              placeholder="جستجو در پیام‌ها..."
              className="pvi-search-input"
              dir="auto"
              tabIndex={isSearch ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  onSearchPrev?.();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  onSearchNext?.();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCollapse?.();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="pvi-btn pvi-btn--mute"
            onClick={onCollapse}
            aria-label="بستن جستجو"
            tabIndex={isSearch ? 0 : -1}
          >
            <FiX size={15} />
          </button>
        </div>

        <div className="pvi-search-bar">
          <span className="pvi-search-meta" dir="rtl">
            {searchQuery.trim()
              ? searchHasMatches
                ? searchMatchLabel
                : 'نتیجه‌ای نیست'
              : 'عبارت را وارد کنید'}
          </span>
          <div className="pvi-search-nav">
            <button
              type="button"
              className="pvi-btn"
              onClick={onSearchPrev}
              disabled={!searchHasMatches}
              aria-label="نتیجه قبلی"
              title="قبلی"
              tabIndex={isSearch ? 0 : -1}
            >
              <FiChevronUp size={16} />
            </button>
            <button
              type="button"
              className="pvi-btn"
              onClick={onSearchNext}
              disabled={!searchHasMatches}
              aria-label="نتیجه بعدی"
              title="بعدی"
              tabIndex={isSearch ? 0 : -1}
            >
              <FiChevronDown size={16} />
            </button>
            <button
              type="button"
              className="pvi-btn"
              onClick={onBackToMenu}
              aria-label="بازگشت به منو"
              tabIndex={isSearch ? 0 : -1}
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeaderPv({
  selectionMode = false,
  selectedCount = 0,
  onClearSelection,
  onCopySelected,
  onReplySelected,
  onForwardSelected,
  onDeleteSelected,
  onJumpToMessage,
  onClearHighlight,
}) {
  const { activeChat, typingUsers, messages } = useChat();
  const { callConversation, isInCall } = useCall();
  const { isDark } = useTheme();
  const { liquidGlassEnabled } = usePerformance();
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [view, setView] = useState('compact');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const prevModeRef = useRef(null);
  const closeTimerRef = useRef(null);
  const selectUiRef = useRef(false);
  const selectEnterKeyRef = useRef(0);
  const jumpTimerRef = useRef(null);
  const isSelecting = Boolean(selectionMode && selectedCount > 0);
  const [selectUi, setSelectUi] = useState(false);
  const [selectPhase, setSelectPhase] = useState(''); // 'in' | 'out' | ''
  const [selectEnterKey, setSelectEnterKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const typing = Boolean(activeChat?.id && typingUsers?.[activeChat.id]);
  const mode = presenceMode(activeChat, typing);
  const subtitle = useMemo(
    () => getSubtitle(activeChat, typing, nowTs),
    [activeChat, typing, nowTs]
  );

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !Array.isArray(messages) || messages.length === 0) return [];
    const ids = [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      const hay = getSearchableText(msg?.text).toLowerCase();
      if (hay && hay.includes(q)) ids.push(String(msg.id));
    }
    return ids;
  }, [messages, searchQuery]);

  const searchHasMatches = searchMatches.length > 0;
  const safeMatchIndex = searchHasMatches
    ? ((matchIndex % searchMatches.length) + searchMatches.length) % searchMatches.length
    : 0;
  const searchMatchLabel = searchHasMatches
    ? `${(safeMatchIndex + 1).toLocaleString('fa-IR')} از ${searchMatches.length.toLocaleString('fa-IR')}`
    : '';

  const clearAnimTimers = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openIsland = () => {
    clearAnimTimers();
    setView('menu');
  };

  const closeIsland = () => {
    clearAnimTimers();
    setSearchQuery('');
    setMatchIndex(0);
    onClearHighlight?.();
    setView('compact');
  };

  const openInfo = () => {
    clearAnimTimers();
    setView('info');
  };

  const openSearch = () => {
    clearAnimTimers();
    setView('search');
  };

  useEffect(() => {
    setSearchQuery('');
    setMatchIndex(0);
    if (view === 'search') setView('compact');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when chat changes
  }, [activeChat?.id]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (view !== 'search') return undefined;
    const t = window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 280);
    return () => window.clearTimeout(t);
  }, [view]);

  useEffect(() => {
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
    }
    if (view !== 'search') return undefined;
    if (!searchHasMatches) {
      onClearHighlight?.();
      return undefined;
    }
    const id = searchMatches[safeMatchIndex];
    jumpTimerRef.current = window.setTimeout(() => {
      onJumpToMessage?.(id);
    }, 120);
    return () => {
      if (jumpTimerRef.current) {
        window.clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }
    };
  }, [
    view,
    searchHasMatches,
    searchMatches,
    safeMatchIndex,
    onJumpToMessage,
    onClearHighlight,
  ]);

  useEffect(() => {
    if (view !== 'info' || !activeChat) {
      if (view !== 'info') setProfile(null);
      return undefined;
    }

    let cancelled = false;

    if (activeChat.type === 'personal' && activeChat.peerUserId) {
      setProfileLoading(true);
      profileService
        .getPublicProfile(activeChat.peerUserId)
        .then((data) => {
          if (!cancelled) setProfile(data);
        })
        .catch(() => {
          if (!cancelled) setProfile(null);
        })
        .finally(() => {
          if (!cancelled) setProfileLoading(false);
        });
    } else {
      setProfile(null);
      setProfileLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [view, activeChat]);

  useEffect(() => {
    if (isSelecting) {
      clearAnimTimers();
      setSearchQuery('');
      setMatchIndex(0);
      setView('compact');
      selectUiRef.current = true;
      selectEnterKeyRef.current += 1;
      setSelectEnterKey(selectEnterKeyRef.current);
      setSelectUi(true);
      setSelectPhase('in');
      return undefined;
    }
    if (!selectUiRef.current) return undefined;
    setSelectPhase('out');
    const t = window.setTimeout(() => {
      selectUiRef.current = false;
      setSelectUi(false);
      setSelectPhase('');
    }, 420);
    return () => window.clearTimeout(t);
  }, [isSelecting]);

  useEffect(() => {
    if (prevModeRef.current == null) {
      prevModeRef.current = mode;
      return;
    }
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    if (isSelecting || selectUi) return;
    if (view === 'search' || view === 'info') return;
    if ((mode === 'typing' || mode === 'online') && view === 'compact') {
      openIsland();
      closeTimerRef.current = window.setTimeout(() => closeIsland(), 1600);
    }
  }, [mode, view, isSelecting, selectUi]);

  useEffect(() => {
    // Keep search open while browsing results in the chat
    if (selectUi || view === 'compact' || view === 'search') return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) closeIsland();
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [view, selectUi]);

  useEffect(() => () => clearAnimTimers(), []);

  const goSearchPrev = () => {
    if (!searchHasMatches) return;
    setMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length);
  };

  const goSearchNext = () => {
    if (!searchHasMatches) return;
    setMatchIndex((i) => (i + 1) % searchMatches.length);
  };

  const name = activeChat?.name || 'گفتگو';
  const avatar = activeChat?.avatar;
  const useGlass = liquidGlassEnabled && !selectUi;
  const canCall =
    !isInCall &&
    activeChat &&
    activeChat.type !== 'channels' &&
    activeChat.type !== 'channel';

  const islandClass = [
    'pvi-island',
    selectUi || view === 'compact' ? 'is-compact' : '',
    !selectUi && view === 'menu' ? 'is-expanded' : '',
    !selectUi && view === 'info' ? 'is-info' : '',
    !selectUi && view === 'search' ? 'is-search' : '',
    selectUi ? 'is-select' : `is-${mode}`,
    selectPhase === 'in' ? 'is-select-in' : '',
    selectPhase === 'out' ? 'is-select-out' : '',
    useGlass ? 'pvi-island--glass' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = selectUi ? (
    <SelectIslandBody
      key={selectEnterKey}
      count={selectedCount}
      canReply={selectedCount === 1}
      onCopy={onCopySelected}
      onReply={onReplySelected}
      onForward={onForwardSelected}
      onDelete={onDeleteSelected}
      onClear={onClearSelection}
      phase={selectPhase || 'in'}
    />
  ) : (
    <IslandBody
      view={view}
      mode={mode}
      chat={activeChat}
      name={name}
      avatar={avatar}
      subtitle={subtitle}
      profile={profile}
      profileLoading={profileLoading}
      searchQuery={searchQuery}
      searchMatchLabel={searchMatchLabel}
      searchHasMatches={searchHasMatches}
      searchInputRef={searchInputRef}
      onExpand={openIsland}
      onCollapse={closeIsland}
      onInfo={openInfo}
      onSearch={openSearch}
      canCall={canCall}
      onCall={() => {
        if (!activeChat || !canCall) return;
        callConversation(activeChat, { video: false });
        closeIsland();
      }}
      onBackToMenu={() => {
        setSearchQuery('');
        setMatchIndex(0);
        onClearHighlight?.();
        setView('menu');
      }}
      onSearchQueryChange={setSearchQuery}
      onSearchPrev={goSearchPrev}
      onSearchNext={goSearchNext}
    />
  );

  return (
    <header className="pvi-stage" ref={rootRef}>
      {useGlass ? (
        <LiquidGlass
          className={islandClass}
          contentClassName="items-stretch h-full min-h-0"
          {...CHAT_INPUT_GLASS}
          depth={9}
          strength={38}
          blur={2.4}
          chromaticAberration={0.2}
          overlay={chatGlassOverlay(isDark)}
        >
          <div className="pvi-glass-fx" aria-hidden>
            <div className="pvi-glow" />
            <div className="pvi-specular" />
          </div>
          {body}
        </LiquidGlass>
      ) : (
        <div className={islandClass}>
          {!selectUi ? <div className="pvi-glow" aria-hidden /> : null}
          {!selectUi ? <div className="pvi-specular" aria-hidden /> : null}
          {body}
        </div>
      )}
    </header>
  );
}
