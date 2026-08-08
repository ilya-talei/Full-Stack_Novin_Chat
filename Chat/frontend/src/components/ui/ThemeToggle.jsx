import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '@context/ThemeContext';
import LiquidGlass from '@components/ui/LiquidGlass';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';

export default function ThemeToggle({ compact = false, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const glassOverlay = chatGlassOverlay(isDark);

  if (compact) {
    return (
      <LiquidGlass
        button
        inline
        className={`rounded-xl ${className}`}
        {...CHAT_INPUT_GLASS}
        overlay={glassOverlay}
      >
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'حالت روشن' : 'حالت تاریک'}
          title={isDark ? 'حالت روشن' : 'حالت تاریک'}
          className="w-10 h-10 flex items-center justify-center text-ink-secondary hover:text-ink"
        >
          {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </LiquidGlass>
    );
  }

  return (
    <LiquidGlass
      fill
      className={`rounded-2xl ${className}`}
      {...CHAT_INPUT_GLASS}
      overlay={glassOverlay}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-npurple-borders/20 text-npurple-borders flex items-center justify-center">
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </span>
          <div className="text-right">
            <div className="text-ink text-[15px] font-medium">ظاهر برنامه</div>
            <div className="text-ink-muted text-xs mt-0.5">
              {isDark ? 'حالت تاریک فعال است' : 'حالت روشن فعال است'}
            </div>
          </div>
        </div>
        <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-surface-muted border border-hairline/15 px-0.5 transition-colors">
          <span
            className={`h-5 w-5 rounded-full bg-npurple-borders shadow transition-transform ${
              isDark ? 'translate-x-0' : '-translate-x-5'
            }`}
          />
        </span>
      </button>
    </LiquidGlass>
  );
}
