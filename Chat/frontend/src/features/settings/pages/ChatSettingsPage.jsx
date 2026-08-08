import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiImage, FiTrash2 } from 'react-icons/fi';
import { useSettings } from '@context/SettingsContext';
import { useTheme } from '@context/ThemeContext';
import { useToast } from '@components/ui/Toast';
import { ROUTES } from '@constants/routes';
import {
  compressWallpaperFile,
  clearCustomWallpaper,
  getCustomWallpaper,
  saveCustomWallpaper,
} from '@utils/chatWallpaper';
import { WALLPAPER_THEMES } from '@features/chat/utils/wallpaperThemes';
import {
  TgCell,
  TgNavHeader,
  TgRadioRow,
  TgSection,
  TgSlider,
  TgToggle,
} from '../components/TgUi';

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

function WallpaperSwatch({ theme, isDark, active, onSelect }) {
  const mode = isDark ? 'dark' : 'light';
  const tint = theme.tint[mode];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-colors ${
        active ? 'border-[#6A9BB8]' : 'border-transparent ring-1 ring-hairline/15'
      }`}
      aria-pressed={active}
    >
      <span
        className="absolute inset-0"
        style={{ backgroundColor: theme.base[mode] }}
      />
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${theme.pattern}")`,
          backgroundSize: '72px 72px',
          backgroundRepeat: 'repeat',
          opacity: theme.opacity[mode],
          mixBlendMode: isDark ? 'screen' : 'multiply',
        }}
      />
      {tint ? (
        <span className="absolute inset-0" style={{ background: tint }} />
      ) : null}
      <span className="absolute inset-x-0 bottom-0 py-1 text-[11px] text-center bg-black/45 text-white">
        {theme.title}
      </span>
    </button>
  );
}

export default function ChatSettingsPage() {
  const navigate = useNavigate();
  const { settings, patch } = useSettings();
  const { isDark, setTheme } = useTheme();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [customPreview, setCustomPreview] = useState(() => getCustomWallpaper());
  const [busy, setBusy] = useState(false);

  const selected = settings.chat.wallpaper || 'default';

  const pickPreset = (id) => {
    patch('chat.wallpaper', id);
  };

  const onPickGallery = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressWallpaperFile(file);
      saveCustomWallpaper(dataUrl);
      setCustomPreview(dataUrl);
      patch('chat.wallpaper', 'custom');
      addToast('پس‌زمینه شخصی تنظیم شد', 'success');
    } catch (err) {
      addToast(err?.message || 'انتخاب تصویر ناموفق بود', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = () => {
    clearCustomWallpaper();
    setCustomPreview('');
    if (selected === 'custom') patch('chat.wallpaper', 'default');
    addToast('پس‌زمینه شخصی حذف شد', 'success');
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="تنظیمات گفتگو" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickGallery}
      />

      <TgSection footer="اندازه متن پیام‌ها.">
        <TgSlider
          value={settings.chat.messageTextSize}
          onChange={(v) => patch('chat.messageTextSize', v)}
        />
        <div
          className="px-4 pb-4 text-ink"
          style={{ fontSize: settings.chat.messageTextSize }}
        >
          نمونه متن پیام
        </div>
      </TgSection>

      <TgSection>
        <TgCell
          title="حالت تاریک"
          chevron={false}
          last
          right={<TgToggle checked={isDark} onChange={(on) => setTheme(on ? 'dark' : 'light')} />}
        />
      </TgSection>

      <TgSection footer="پس‌زمینهٔ آرام‌تر برای استفاده طولانی بهتر است. می‌توانید از گالری هم انتخاب کنید.">
        <div className="px-3.5 py-3 grid grid-cols-3 gap-2.5">
          {WALLPAPER_THEMES.map((theme) => (
            <WallpaperSwatch
              key={theme.id}
              theme={theme}
              isDark={isDark}
              active={selected === theme.id}
              onSelect={() => pickPreset(theme.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              if (customPreview) pickPreset('custom');
              else fileRef.current?.click();
            }}
            className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-colors ${
              selected === 'custom'
                ? 'border-[#6A9BB8]'
                : 'border-transparent ring-1 ring-hairline/15'
            }`}
            aria-pressed={selected === 'custom'}
          >
            {customPreview ? (
              <img
                src={customPreview}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-muted"
                style={{ backgroundColor: isDark ? '#16181c' : '#e8eaef' }}
              >
                <FiImage size={22} />
                <span className="text-[11px]">گالری</span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 py-1 text-[11px] text-center bg-black/45 text-white">
              شخصی
            </span>
          </button>
        </div>

        <TgCell
          title={busy ? 'در حال آماده‌سازی...' : 'انتخاب از گالری'}
          subtitle="عکس دلخواه از دستگاه شما"
          chevron={false}
          icon={
            <span className="w-[30px] h-[30px] rounded-[8px] bg-[#6A9BB8] text-white inline-flex items-center justify-center shrink-0">
              <FiImage size={15} />
            </span>
          }
          onClick={() => !busy && fileRef.current?.click()}
          disabled={busy}
          last={!customPreview}
        />
        {customPreview ? (
          <TgCell
            title="حذف پس‌زمینه شخصی"
            danger
            chevron={false}
            last
            icon={
              <span className="w-[30px] h-[30px] rounded-[8px] bg-[#E53935] text-white inline-flex items-center justify-center shrink-0">
                <FiTrash2 size={15} />
              </span>
            }
            onClick={removeCustom}
          />
        ) : null}
      </TgSection>

      <TgSection>
        <TgRadioRow
          title="فاصله پیش‌فرض حباب‌ها"
          selected={settings.chat.distanceBetweenBubbles === 'default'}
          onSelect={() => patch('chat.distanceBetweenBubbles', 'default')}
        />
        <TgRadioRow
          title="فشرده"
          selected={settings.chat.distanceBetweenBubbles === 'compact'}
          onSelect={() => patch('chat.distanceBetweenBubbles', 'compact')}
        />
        <TgRadioRow
          title="باز"
          selected={settings.chat.distanceBetweenBubbles === 'relaxed'}
          onSelect={() => patch('chat.distanceBetweenBubbles', 'relaxed')}
          last
        />
      </TgSection>

      <TgSection>
        <ToggleRow title="ارسال با Enter" path="chat.sendByEnter" />
        <ToggleRow title="ارسال با استیکر" path="chat.sendWithSticker" />
        <ToggleRow title="پخش خودکار گیف" path="chat.autoPlayGifs" />
        <ToggleRow title="پخش خودکار ویدیو" path="chat.autoPlayVideos" />
        <ToggleRow title="انیمیشن‌ها" path="chat.animations" />
        <ToggleRow title="ایموجی بزرگ" path="chat.largeEmoji" />
        <ToggleRow title="جایگزینی ایموجی" path="chat.replaceEmoji" />
        <ToggleRow title="بلند کردن برای صحبت" path="chat.raiseToSpeak" last />
      </TgSection>
    </div>
  );
}
