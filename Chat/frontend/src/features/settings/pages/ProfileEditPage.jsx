import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCamera } from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import Input from '@components/ui/Input';
import Spinner from '@components/ui/Spinner';
import { useAuth } from '@context/AuthContext';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { profileService } from '@services/notificationService';
import { authService } from '@services/authService';
import { AUTH_ACTIONS } from '@constants/actionTypes';
import { ROUTES } from '@constants/routes';
import { TgNavHeader, TgSection } from '../components/TgUi';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, dispatch } = useAuth();
  const { settings, setSection } = useSettings();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const previewUrlRef = useRef('');
  const [avatar, setAvatar] = useState(user?.avatar);
  const [form, setForm] = useState({
    firstName: settings.profile.firstName,
    lastName: settings.profile.lastName,
    bio: settings.profile.bio,
    username: settings.profile.username,
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    profileService
      .getProfile()
      .then((p) => {
        setAvatar(p.avatar);
        setForm((prev) => ({
          firstName: prev.firstName || (p.name || '').split(' ')[0] || '',
          lastName: prev.lastName || (p.name || '').split(' ').slice(1).join(' ') || '',
          bio: prev.bio || p.bio || '',
          username: prev.username || p.username || '',
        }));
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('فقط تصویر JPG، PNG یا WebP مجاز است', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('حجم تصویر باید کمتر از ۵ مگابایت باشد', 'error');
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setAvatar(previewUrlRef.current);
    setAvatarUploading(true);
    try {
      const fileName = await profileService.uploadAvatar(file);
      const url =
        typeof fileName === 'string' && fileName.startsWith('http')
          ? fileName
          : previewUrlRef.current;
      setAvatar(url);
      const updatedUser = { ...user, avatar: url };
      authService.updateStoredUser(updatedUser);
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: updatedUser });
      addToast('عکس پروفایل به‌روز شد', 'success');
    } catch (err) {
      addToast(err?.message || 'آپلود ناموفق بود', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSection('profile', form);
    try {
      await profileService.updateProfile({
        name: [form.firstName, form.lastName].filter(Boolean).join(' '),
        bio: form.bio,
        username: form.username,
      });
      const updatedUser = {
        ...user,
        name: [form.firstName, form.lastName].filter(Boolean).join(' '),
        username: form.username,
        avatar,
      };
      authService.updateStoredUser(updatedUser);
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: updatedUser });
      addToast('پروفایل ذخیره شد', 'success');
      navigate(ROUTES.ACCOUNT);
    } catch (err) {
      addToast(err?.message || 'ذخیره ناموفق بود', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader
        title="ویرایش پروفایل"
        onBack={() => navigate(ROUTES.ACCOUNT)}
        right={
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-2 py-1 text-[16px] font-medium text-[#3390EC] disabled:opacity-50"
          >
            ذخیره
          </button>
        }
      />
      <div className="flex flex-col items-center pt-6 pb-4">
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => fileRef.current?.click()}
          aria-label="تغییر عکس پروفایل"
          className="group relative rounded-full disabled:opacity-70"
        >
          <Avatar src={avatar} alt={form.firstName || 'U'} size="lg" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white transition-colors group-hover:bg-black/50">
            {avatarUploading ? <Spinner /> : <FiCamera size={25} />}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPickAvatar}
        />
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => fileRef.current?.click()}
          className="mt-3 text-[15px] text-[#3390EC] disabled:opacity-50"
        >
          {avatarUploading ? 'در حال آپلود…' : 'تنظیم عکس پروفایل'}
        </button>
        <p className="mt-1 text-[12px] text-ink-muted">JPG، PNG یا WebP تا ۵ مگابایت</p>
      </div>

      <TgSection footer="نام شما در گفتگوها و مخاطبین نمایش داده می‌شود.">
        <div className="px-3 py-2 space-y-2">
          <Input
            label="نام"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="نام خانوادگی"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>
      </TgSection>

      <TgSection footer="بیو می‌تواند حداکثر ۷۰ کاراکتر باشد.">
        <div className="px-3 py-2">
          <Input
            label="بیو"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 70) })}
          />
        </div>
      </TgSection>

      <TgSection footer="نام کاربری یکتا به دیگران اجازه می‌دهد بدون شماره شما را پیدا کنند.">
        <div className="px-3 py-2">
          <Input
            label="نام کاربری"
            value={form.username}
            onChange={(e) =>
              setForm({
                ...form,
                username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32),
              })
            }
          />
        </div>
      </TgSection>
    </div>
  );
}
