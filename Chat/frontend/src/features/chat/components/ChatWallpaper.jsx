import { useEffect, useState } from 'react';
import { useTheme } from '@context/ThemeContext';
import { useSettings } from '@context/SettingsContext';
import { getCustomWallpaper } from '@utils/chatWallpaper';
import { getWallpaperTheme } from '../utils/wallpaperThemes';

export default function ChatWallpaper() {
  const { isDark } = useTheme();
  const { settings } = useSettings();
  const wallpaper = settings.chat.wallpaper || 'default';
  const [customUrl, setCustomUrl] = useState(() => getCustomWallpaper());

  useEffect(() => {
    const sync = () => setCustomUrl(getCustomWallpaper());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('novin-wallpaper-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('novin-wallpaper-change', sync);
    };
  }, [wallpaper]);

  if (wallpaper === 'custom' && customUrl) {
    return (
      <div
        className="chat-wallpaper-pattern chat-wallpaper-custom"
        aria-hidden
        style={{
          backgroundImage: `url("${customUrl}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          opacity: 1,
          pointerEvents: 'none',
        }}
      />
    );
  }

  const theme = getWallpaperTheme(wallpaper);
  const mode = isDark ? 'dark' : 'light';
  const tint = theme.tint[mode];
  const opacity = theme.opacity[mode];
  const base = theme.base[mode];

  return (
    <>
      <div
        className="chat-wallpaper-pattern chat-wallpaper-base"
        aria-hidden
        style={{
          backgroundColor: base,
          opacity: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        className="chat-wallpaper-pattern"
        aria-hidden
        style={{
          backgroundImage: `url("${theme.pattern}")`,
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center top',
          backgroundSize: `${theme.tile} ${theme.tile}`,
          opacity,
          pointerEvents: 'none',
          mixBlendMode: isDark ? 'screen' : 'multiply',
        }}
      />
      {tint ? (
        <div
          className="chat-wallpaper-pattern"
          style={{ background: tint, opacity: 1, mixBlendMode: 'normal' }}
          aria-hidden
        />
      ) : null}
    </>
  );
}
