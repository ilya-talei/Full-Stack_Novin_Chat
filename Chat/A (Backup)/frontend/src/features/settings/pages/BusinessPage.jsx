import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase } from 'react-icons/fi';
import { ROUTES } from '@constants/routes';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import Input from '@components/ui/Input';
import { TgCell, TgNavHeader, TgSection, TgToggle } from '../components/TgUi';

export default function BusinessPage() {
  const navigate = useNavigate();
  const { settings, setSection, patch } = useSettings();
  const { addToast } = useToast();
  const biz = settings.business || {};
  const [draft, setDraft] = useState({
    hours: biz.hours || '',
    location: biz.location || '',
    quickReply: biz.quickReply || '',
    welcomeMessage: biz.welcomeMessage || '',
  });
  const [editing, setEditing] = useState(null);

  const saveField = (key) => {
    setSection('business', { ...biz, ...draft, enabled: true });
    setEditing(null);
    addToast('ذخیره شد', 'success');
  };

  const labels = {
    hours: 'ساعات کاری',
    location: 'مکان کسب‌وکار',
    quickReply: 'پاسخ سریع',
    welcomeMessage: 'پیام خوش‌آمد',
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="بیزنس" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#8E8E93] flex items-center justify-center text-white">
          <FiBriefcase size={34} />
        </div>
        <h2 className="mt-4 text-[22px] font-bold text-ink">Novin Chat Business</h2>
        <p className="mt-2 text-[15px] text-ink-muted leading-6">
          ابزارهای کسب‌وکار برای ساعات کاری، مکان، و پیام‌های خودکار.
        </p>
      </div>

      <TgSection>
        <TgCell
          title="حالت بیزنس"
          chevron={false}
          last
          right={
            <TgToggle
              checked={Boolean(biz.enabled)}
              onChange={(v) => patch('business.enabled', v)}
            />
          }
        />
      </TgSection>

      <TgSection footer="این اطلاعات در پروفایل کسب‌وکار شما ذخیره می‌شود.">
        {Object.keys(labels).map((key, i, arr) => (
          <TgCell
            key={key}
            title={labels[key]}
            value={draft[key] ? 'تنظیم شده' : 'خالی'}
            last={i === arr.length - 1}
            onClick={() => setEditing(key)}
          />
        ))}
      </TgSection>

      {editing ? (
        <TgSection>
          <div className="px-3 py-3 space-y-3">
            <Input
              label={labels[editing]}
              value={draft[editing]}
              onChange={(e) => setDraft((d) => ({ ...d, [editing]: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveField(editing)}
                className="flex-1 h-11 rounded-[10px] bg-[#3390EC] text-white text-[16px] font-medium"
              >
                ذخیره
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 px-4 rounded-[10px] bg-black/5 dark:bg-white/10 text-ink text-[15px]"
              >
                انصراف
              </button>
            </div>
          </div>
        </TgSection>
      ) : null}
    </div>
  );
}
