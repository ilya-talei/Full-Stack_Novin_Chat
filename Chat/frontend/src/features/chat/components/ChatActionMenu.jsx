import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiMessageCircle, FiUsers, FiRadio } from 'react-icons/fi';
import LiquidGlass from '@components/ui/LiquidGlass';
import { useTheme } from '@context/ThemeContext';
import { CHAT_INPUT_GLASS, chatGlassOverlay, CHAT_GLASS_ACCENT_OVERLAY } from '@constants/glass';

const actions = [
  {
    id: 'chat',
    label: 'گفتگوی جدید',
    icon: FiMessageCircle,
    tone: 'bg-sky-500/20 text-sky-600 dark:text-sky-300',
  },
  {
    id: 'group',
    label: 'گروه جدید',
    icon: FiUsers,
    tone: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
  },
  {
    id: 'channel',
    label: 'کانال جدید',
    icon: FiRadio,
    tone: 'bg-violet-500/20 text-violet-600 dark:text-violet-300',
  },
];

export default function ChatActionMenu({ onNewChat, onNewGroup, onNewChannel }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(null);
  const menuRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    setHost(document.getElementById('sidebar-float-layer'));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlers = {
    chat: () => {
      onNewChat();
      setOpen(false);
    },
    group: () => {
      onNewGroup();
      setOpen(false);
    },
    channel: () => {
      onNewChannel();
      setOpen(false);
    },
  };

  const menu = (
    <div
      ref={menuRef}
      className="pointer-events-auto absolute bottom-[100px] left-8 z-[55] flex flex-col items-start gap-3"
    >
      {open && (
        <LiquidGlass
          className="w-[220px] rounded-2xl animate-menu-up border border-hairline/[0.08]"
          contentClassName="flex-col items-stretch"
          {...CHAT_INPUT_GLASS}
          overlay={chatGlassOverlay(isDark)}
        >
          <div className="p-2 w-full flex flex-col gap-1">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={handlers[action.id]}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/15 transition-colors text-ink text-sm text-right"
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.tone}`}
                >
                  <action.icon size={18} />
                </span>
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </LiquidGlass>
      )}

      <LiquidGlass
        button
        className="rounded-2xl"
        {...CHAT_INPUT_GLASS}
        overlay={open ? chatGlassOverlay(isDark) : CHAT_GLASS_ACCENT_OVERLAY}
      >
        <button
          type="button"
          aria-label="منوی ایجاد"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
            open
              ? 'bg-transparent rotate-45 text-ink'
              : 'bg-npurple-borders hover:bg-[#5A97C6] text-white'
          }`}
        >
          <FiPlus className="text-2xl" />
        </button>
      </LiquidGlass>
    </div>
  );

  if (!host) return null;
  return createPortal(menu, host);
}
