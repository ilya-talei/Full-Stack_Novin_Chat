import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { ROUTES } from '@constants/routes';
import {
  clearAppCache,
  estimateLocalStorageBytes,
  formatBytesFa,
} from '@utils/settingsRuntime';
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

export default function DataStoragePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [usage, setUsage] = useState(() => estimateLocalStorageBytes());

  const usageLabel = useMemo(() => formatBytesFa(usage), [usage]);

  useEffect(() => {
    setUsage(estimateLocalStorageBytes());
  }, []);

  const refreshUsage = () => setUsage(estimateLocalStorageBytes());

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="داده و حافظه" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />

      <TgSection footer="دانلود خودکار رسانه هنگام استفاده از اینترنت.">
        <ToggleRow title="عکس‌ها" path="data.autoDownloadPhotos" />
        <ToggleRow title="ویدیوها" path="data.autoDownloadVideos" />
        <ToggleRow title="فایل‌ها" path="data.autoDownloadFiles" />
        <ToggleRow title="پیام‌های صوتی" path="data.autoDownloadVoice" />
        <ToggleRow title="گیف و استیکر" path="data.autoDownloadGif" last />
      </TgSection>

      <TgSection>
        <ToggleRow title="ذخیره در گالری" path="data.saveToGallery" />
        <ToggleRow title="مصرف کمتر داده" path="data.useLessData" />
        <ToggleRow title="پخش جریانی ویدیو" path="data.streamVideos" />
        <ToggleRow title="پاک‌سازی کش هنگام خروج" path="data.clearCacheOnExit" last />
      </TgSection>

      <TgSection>
        <TgCell
          title="پاک کردن حافظه پنهان"
          chevron={false}
          onClick={() => {
            clearAppCache({ includeDownloads: false });
            refreshUsage();
            addToast('کش پاک شد', 'success');
          }}
        />
        <TgCell
          title="پاک کردن دانلودها"
          chevron={false}
          danger
          last
          onClick={() => {
            clearAppCache({ includeDownloads: true });
            refreshUsage();
            addToast('دانلودها و کش پاک شد', 'success');
          }}
        />
      </TgSection>

      <TgSection footer="حجم تقریبی ذخیره‌سازی محلی این دستگاه.">
        <TgCell title="حافظه استفاده شده" value={usageLabel} chevron={false} last />
      </TgSection>
    </div>
  );
}
