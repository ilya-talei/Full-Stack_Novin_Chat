import { useCallback, useEffect, useState } from 'react';
import { FiRadio, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Avatar from '@components/ui/Avatar';
import Spinner from '@components/ui/Spinner';
import { ROUTES } from '@constants/routes';
import { chatManagementService } from '@services/chatManagementService';
import { TgNavHeader, TgSection } from '../components/TgUi';

export default function ManagedChatsPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setChats(await chatManagementService.getManageableChats());
    } catch (err) {
      setError(err?.message || 'دریافت گروه‌ها و کانال‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader
        title="مدیریت گروه‌ها و کانال‌ها"
        onBack={() => navigate(ROUTES.ACCOUNT)}
        right={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="به‌روزرسانی"
            className="p-2 text-[#3390EC] disabled:opacity-50"
          >
            <FiRefreshCw size={19} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />
      <div className="h-3" />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : error ? (
        <div className="mx-4 rounded-2xl bg-[rgb(var(--surface-elevated))] p-6 text-center">
          <p className="text-[14px] text-[#E53935]">{error}</p>
          <button type="button" onClick={load} className="mt-4 text-[15px] text-[#3390EC]">
            تلاش دوباره
          </button>
        </div>
      ) : chats.length === 0 ? (
        <div className="px-8 py-20 text-center">
          <FiUsers className="mx-auto text-ink-muted/60" size={42} />
          <p className="mt-4 text-[16px] text-ink">موردی برای مدیریت وجود ندارد</p>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            گروه‌ها و کانال‌هایی که در آن‌ها مالک یا مدیر هستید اینجا نمایش داده می‌شوند.
          </p>
        </div>
      ) : (
        <TgSection footer={`${chats.length.toLocaleString('fa-IR')} مورد قابل مدیریت`}>
          {chats.map((chat, index) => (
            <button
              key={chat.id}
              type="button"
              onClick={() =>
                navigate(ROUTES.SETTINGS_MANAGED_CHAT.replace(':chatId', chat.id))
              }
              className={`w-full min-h-[68px] px-3.5 flex items-center gap-3 text-right hover:bg-black/[0.04] dark:hover:bg-white/[0.04] ${
                index < chats.length - 1 ? 'border-b border-hairline/[0.08]' : ''
              }`}
            >
              <Avatar src={chat.avatar} alt={chat.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium text-ink">{chat.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
                  {chat.type === 'channel' ? <FiRadio size={12} /> : <FiUsers size={12} />}
                  {chat.type === 'channel' ? 'کانال' : 'گروه'}
                  {chat.memberCount ? ` · ${chat.memberCount.toLocaleString('fa-IR')} عضو` : ''}
                </span>
              </span>
              <svg width="8" height="14" viewBox="0 0 8 14" className="text-ink-muted/70" aria-hidden>
                <path d="M7 1L1 7l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </TgSection>
      )}
    </div>
  );
}
