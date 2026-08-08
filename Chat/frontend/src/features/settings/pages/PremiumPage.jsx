import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiStar } from 'react-icons/fi';
import { ROUTES } from '@constants/routes';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { TgNavHeader, TgSection } from '../components/TgUi';

const PERKS = [
  'آپلود فایل تا ۴ گیگابایت',
  'دانلود با سرعت بالاتر',
  'بدون تبلیغات',
  'صدا و واکنش‌های اختصاصی',
  'پوشه‌های نامحدود',
  'شناسه کاربری یکتا و پروفایل پیشرفته',
];

export default function PremiumPage() {
  const navigate = useNavigate();
  const { settings, setSection } = useSettings();
  const { addToast } = useToast();
  const active = Boolean(settings.premium?.active);

  const togglePremium = () => {
    if (active) {
      setSection('premium', { active: false, activatedAt: null });
      addToast('پرمیوم غیرفعال شد', 'info');
      return;
    }
    setSection('premium', {
      active: true,
      activatedAt: new Date().toISOString(),
    });
    addToast('پرمیوم فعال شد', 'success');
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="پرمیوم" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F5C84C] to-[#E8A317] flex items-center justify-center text-white shadow-lg">
          <FiStar size={36} />
        </div>
        <h2 className="mt-4 text-[22px] font-bold text-ink">Novin Chat Premium</h2>
        <p className="mt-2 text-[15px] text-ink-muted leading-6">
          {active
            ? 'اشتراک پرمیوم شما فعال است.'
            : 'امکانات بیشتر برای کسانی که می‌خواهند تجربه کامل‌تری داشته باشند.'}
        </p>
      </div>
      <TgSection>
        <div className="px-4 py-3 space-y-3">
          {PERKS.map((p) => (
            <div key={p} className="flex items-center gap-3 text-[15px] text-ink">
              <span className="w-6 h-6 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center shrink-0">
                <FiCheck size={14} />
              </span>
              {p}
            </div>
          ))}
        </div>
      </TgSection>
      <div className="px-4">
        <button
          type="button"
          onClick={togglePremium}
          className={`w-full h-12 rounded-[12px] text-white text-[17px] font-semibold shadow ${
            active
              ? 'bg-[#8E8E93]'
              : 'bg-gradient-to-l from-[#F5C84C] to-[#E8A317]'
          }`}
        >
          {active ? 'لغو پرمیوم' : 'فعال‌سازی پرمیوم'}
        </button>
      </div>
    </div>
  );
}
