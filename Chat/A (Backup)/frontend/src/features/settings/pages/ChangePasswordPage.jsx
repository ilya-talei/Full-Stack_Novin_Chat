import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '@components/ui/Input';
import { useToast } from '@components/ui/Toast';
import { profileService } from '@services/notificationService';
import { ROUTES } from '@constants/routes';
import { TgNavHeader, TgSection } from '../components/TgUi';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.current || !form.next) {
      addToast('رمز فعلی و جدید را وارد کنید', 'warning');
      return;
    }
    if (form.next !== form.confirm) {
      addToast('تکرار رمز مطابقت ندارد', 'error');
      return;
    }
    if (form.next.length < 6) {
      addToast('رمز باید حداقل ۶ کاراکتر باشد', 'warning');
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword(form.current, form.next);
      addToast('رمز عبور تغییر کرد', 'success');
      navigate(ROUTES.SETTINGS_ACCOUNT);
    } catch (err) {
      addToast(err?.message || 'تغییر رمز ناموفق بود', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader
        title="تغییر رمز عبور"
        onBack={() => navigate(ROUTES.SETTINGS_ACCOUNT)}
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
      <div className="h-3" />
      <TgSection>
        <div className="px-3 py-3 space-y-3">
          <Input
            label="رمز فعلی"
            type="password"
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
          />
          <Input
            label="رمز جدید"
            type="password"
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
          />
          <Input
            label="تکرار رمز جدید"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </div>
      </TgSection>
    </div>
  );
}
