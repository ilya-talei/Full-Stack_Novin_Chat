import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { profileService } from '@services/notificationService';
import { ROUTES } from '@constants/routes';
import { TgCell, TgNavHeader, TgSection } from '../components/TgUi';

export default function MyAccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, setSection } = useSettings();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    profileService.getProfile(user?.id).then(setProfile).catch(() => setProfile(user));
  }, [user]);

  const phone = profile?.phone || user?.phone || '—';
  const username = settings.profile.username || profile?.username || user?.username || '';
  const name =
    [settings.profile.firstName, settings.profile.lastName].filter(Boolean).join(' ') ||
    profile?.name ||
    user?.name ||
    '';

  const handleDelete = async () => {
    const ok = window.confirm(
      'آیا مطمئن هستید؟ با حذف حساب، داده‌های شما برای همیشه از دسترس خارج می‌شود.'
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await profileService.deleteAccount();
      addToast('حساب حذف شد', 'success');
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (err) {
      addToast(err?.message || 'حذف حساب ناموفق بود', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="حساب من" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      <TgSection footer="مدیریت اطلاعات حساب کاربری، شماره تلفن و نام کاربری.">
        <TgCell title="شماره تلفن" value={phone} chevron={false} />
        <TgCell
          title="نام کاربری"
          value={username ? `@${username}` : 'تنظیم نشده'}
          onClick={() => navigate(ROUTES.SETTINGS_PROFILE)}
        />
        <TgCell
          title="اطلاعات پروفایل"
          value={name}
          onClick={() => navigate(ROUTES.SETTINGS_PROFILE)}
          last
        />
      </TgSection>

      <TgSection footer="با حذف حساب، همه گفتگوها و مخاطبین پاک می‌شوند.">
        <TgCell
          title={deleting ? 'در حال حذف...' : 'حذف حساب کاربری'}
          danger
          chevron={false}
          last
          disabled={deleting}
          onClick={handleDelete}
        />
      </TgSection>

      <TgSection>
        <TgCell
          title="تغییر رمز عبور"
          onClick={() => navigate(ROUTES.SETTINGS_PASSWORD)}
          last
        />
      </TgSection>

      <TgSection footer="این تنظیمات فقط روی این دستگاه ذخیره می‌شوند.">
        <TgCell
          title="بازنشانی تنظیمات حساب محلی"
          chevron={false}
          last
          onClick={() => {
            setSection('profile', { firstName: '', lastName: '', bio: '', username: '' });
            addToast('بازنشانی شد', 'success');
          }}
        />
      </TgSection>
    </div>
  );
}
