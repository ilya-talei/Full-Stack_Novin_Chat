import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { ROUTES } from '@constants/routes';
import { getRecentEmojis } from '@utils/settingsRuntime';
import { TgCell, TgNavHeader, TgSection, TgToggle } from '../components/TgUi';

function ToggleRow({ title, path, last }) {
  const { settings, patch } = useSettings();
  const value = path.split('.').reduce((acc, k) => acc?.[k], settings);
  return (
    <TgCell
      title={title}
      chevron={false}
      last={last}
      right={<TgToggle checked={Boolean(value)} onChange={(v) => patch(path, v)} />}
    />
  );
}

export default function StickersPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => {
    setRecentCount(getRecentEmojis().length);
  }, []);

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="استیکر و ایموجی" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      <TgSection>
        <ToggleRow title="پیشنهاد استیکر" path="stickers.suggestStickers" />
        <ToggleRow title="تکرار حلقه‌ای استیکر" path="stickers.loopStickers" />
        <ToggleRow title="پیشنهاد ایموجی متحرک" path="stickers.suggestAnimatedEmoji" last />
      </TgSection>
      <TgSection footer="پک‌های نصب‌شده در این نسخه به‌صورت محلی مدیریت می‌شوند.">
        <TgCell
          title="استیکرهای پیشنهادی"
          value={settings.stickers.suggestStickers ? 'فعال' : 'خاموش'}
          chevron={false}
        />
        <TgCell
          title="ایموجی‌های اخیر"
          value={String(recentCount)}
          chevron={false}
          last
        />
      </TgSection>
    </div>
  );
}
