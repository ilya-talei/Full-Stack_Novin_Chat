import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBookmark,
  FiBriefcase,
  FiCpu,
  FiDatabase,
  FiFolder,
  FiHelpCircle,
  FiLock,
  FiMessageCircle,
  FiMonitor,
  FiSmile,
  FiStar,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import { useAuth } from '@context/AuthContext';
import { useSettings } from '@context/SettingsContext';
import { useTheme } from '@context/ThemeContext';
import { profileService } from '@services/notificationService';
import { settingsService } from '@services/settingsService';
import { ROUTES } from '@constants/routes';
import Spinner from '@components/ui/Spinner';
import { TgCell, TgIcon, TgSection, TgToggle } from '../components/TgUi';

const VIS = {
  everybody: 'همه',
  contacts: 'مخاطبین من',
  nobody: 'هیچ‌کس',
};

export default function SettingsHomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { isDark, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    let alive = true;
    profileService
      .getProfile(user?.id)
      .then((data) => {
        if (alive) setProfile(data);
      })
      .catch(() => {
        if (alive) {
          setProfile({
            name: user?.name || user?.username || 'کاربر',
            username: user?.username,
            phone: user?.phone || '',
            avatar: user?.avatar,
            bio: '',
          });
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    settingsService
      .getSessions()
      .then((sessions) => {
        if (alive) setSessionCount(Array.isArray(sessions) ? sessions.length : 0);
      })
      .catch(() => {
        if (alive) setSessionCount(0);
      });

    return () => {
      alive = false;
    };
  }, [user]);

  const name =
    [settings.profile.firstName, settings.profile.lastName].filter(Boolean).join(' ') ||
    profile?.name ||
    user?.name ||
    'کاربر';
  const username = settings.profile.username || profile?.username || user?.username || '';
  const phone = profile?.phone || user?.phone || '';
  const bio = settings.profile.bio || profile?.bio || '';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-8 bg-[rgb(var(--surface-panel))]">
      <div className="sticky top-0 z-30 bg-[rgb(var(--surface-panel))]/96 backdrop-blur-md border-b border-hairline/[0.06]">
        <div className="h-[52px] flex items-center justify-center">
          <h1 className="text-[17px] font-semibold text-ink">تنظیمات</h1>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(ROUTES.SETTINGS_PROFILE)}
        className="w-full px-4 pt-4 pb-2 flex items-center gap-3.5 text-right hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
      >
        <Avatar src={profile?.avatar || user?.avatar} alt={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-semibold text-ink truncate">{name}</div>
          {username ? (
            <div className="text-[15px] text-ink-muted ltr truncate mt-0.5">@{username}</div>
          ) : null}
          {bio ? <div className="text-[14px] text-ink-muted truncate mt-0.5">{bio}</div> : null}
          {phone ? <div className="text-[14px] text-ink-muted ltr mt-0.5">{phone}</div> : null}
        </div>
        <svg width="8" height="14" viewBox="0 0 8 14" className="text-ink-muted/70 shrink-0" aria-hidden>
          <path d="M7 1L1 7l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <TgSection>
        <TgCell
          icon={<TgIcon color="#3390EC"><FiUser size={16} /></TgIcon>}
          title="حساب من"
          onClick={() => navigate(ROUTES.SETTINGS_ACCOUNT)}
        />
        <TgCell
          icon={<TgIcon color="#F5C84C"><FiStar size={16} /></TgIcon>}
          title="نوین چت پرمیوم"
          subtitle="بدون تبلیغ، آپلود بزرگ‌تر و امکانات بیشتر"
          onClick={() => navigate(ROUTES.SETTINGS_PREMIUM)}
        />
        <TgCell
          icon={<TgIcon color="#8E8E93"><FiBriefcase size={16} /></TgIcon>}
          title="نوین چت بیزنس"
          onClick={() => navigate(ROUTES.SETTINGS_BUSINESS)}
          last
        />
      </TgSection>

      <TgSection>
        <TgCell
          icon={<TgIcon color="#FF9500"><FiBell size={16} /></TgIcon>}
          title="اعلان‌ها و صداها"
          onClick={() => navigate(ROUTES.SETTINGS_NOTIFICATIONS)}
        />
        <TgCell
          icon={<TgIcon color="#34C759"><FiLock size={16} /></TgIcon>}
          title="حریم خصوصی و امنیت"
          value={VIS[settings.privacy.lastSeen]}
          onClick={() => navigate(ROUTES.SETTINGS_PRIVACY)}
        />
        <TgCell
          icon={<TgIcon color="#5AC8FA"><FiDatabase size={16} /></TgIcon>}
          title="داده و حافظه"
          onClick={() => navigate(ROUTES.SETTINGS_DATA)}
        />
        <TgCell
          icon={<TgIcon color="#5BA8E8"><FiMessageCircle size={16} /></TgIcon>}
          title="تنظیمات گفتگو"
          onClick={() => navigate(ROUTES.SETTINGS_CHAT)}
        />
        <TgCell
          icon={<TgIcon color="#5856D6"><FiUsers size={16} /></TgIcon>}
          title="مدیریت گروه‌ها و کانال‌ها"
          subtitle="اعضا، مدیران و مجوزها"
          onClick={() => navigate(ROUTES.SETTINGS_MANAGED_CHATS)}
        />
        <TgCell
          icon={<TgIcon color="#FF2D55"><FiSmile size={16} /></TgIcon>}
          title="استیکر و ایموجی"
          onClick={() => navigate(ROUTES.SETTINGS_STICKERS)}
        />
        <TgCell
          icon={<TgIcon color="#4A97D6"><FiFolder size={16} /></TgIcon>}
          title="پوشه‌ها"
          onClick={() => navigate(ROUTES.SETTINGS_FOLDERS)}
        />
        <TgCell
          icon={<TgIcon color="#007AFF"><FiMonitor size={16} /></TgIcon>}
          title="دستگاه‌ها"
          value={`${sessionCount || settings.devices.sessions.length}`}
          onClick={() => navigate(ROUTES.SETTINGS_DEVICES)}
          last
        />
      </TgSection>

      <TgSection>
        <TgCell
          icon={<TgIcon color="#8E8E93"><FiCpu size={16} /></TgIcon>}
          title="حالت تاریک"
          chevron={false}
          right={<TgToggle checked={isDark} onChange={(on) => setTheme(on ? 'dark' : 'light')} />}
          last
        />
      </TgSection>

      {settings.premium?.active ? (
        <TgSection>
          <TgCell
            icon={<TgIcon color="#F5C84C"><FiStar size={16} /></TgIcon>}
            title="وضعیت پرمیوم"
            value="فعال"
            onClick={() => navigate(ROUTES.SETTINGS_PREMIUM)}
            last
          />
        </TgSection>
      ) : null}

      <TgSection>
        <TgCell
          icon={<TgIcon color="#FF3B30"><FiBookmark size={16} /></TgIcon>}
          title="پیام‌های ذخیره شده"
          onClick={() => navigate(ROUTES.HOME)}
        />
        <TgCell
          icon={<TgIcon color="#FF9500"><FiUser size={16} /></TgIcon>}
          title="مخاطبین اخیر"
          onClick={() => navigate(ROUTES.CONTACTS)}
        />
        <TgCell
          icon={<TgIcon color="#3390EC"><span className="text-[13px] font-bold">فا</span></TgIcon>}
          title="زبان"
          value={settings.language === 'fa' ? 'فارسی' : 'English'}
          onClick={() => navigate(ROUTES.SETTINGS_LANGUAGE)}
          last
        />
      </TgSection>

      <TgSection>
        <TgCell
          icon={<TgIcon color="#34C759"><FiHelpCircle size={16} /></TgIcon>}
          title="پرسش‌های متداول"
          onClick={() => navigate(ROUTES.SETTINGS_HELP)}
        />
        <TgCell
          icon={<TgIcon color="#007AFF"><FiHelpCircle size={16} /></TgIcon>}
          title="سوال بپرسید"
          onClick={() => navigate(ROUTES.SETTINGS_HELP)}
          last
        />
      </TgSection>

      <TgSection>
        <TgCell
          title="خروج از حساب"
          danger
          chevron={false}
          last
          onClick={async () => {
            await logout();
            navigate(ROUTES.LOGIN);
          }}
        />
      </TgSection>

      <p className="text-center text-[13px] text-ink-muted pb-4">Novin Chat</p>
    </div>
  );
}
