import { FiDroplet } from 'react-icons/fi';
import LiquidGlass from '@components/ui/LiquidGlass';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';
import { usePerformance } from '@context/PerformanceContext';
import { useTheme } from '@context/ThemeContext';

export default function GlassToggle({ className = '' }) {
  const { liquidGlassEnabled, toggleLiquidGlass, hardware } = usePerformance();
  const { isDark } = useTheme();

  return (
    <LiquidGlass
      fill
      className={`rounded-2xl ${className}`}
      {...CHAT_INPUT_GLASS}
      overlay={chatGlassOverlay(isDark)}
    >
      <button
        type="button"
        onClick={toggleLiquidGlass}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-npurple-borders/20 text-npurple-borders flex items-center justify-center shrink-0">
            <FiDroplet size={18} />
          </span>
          <div className="text-right min-w-0">
            <div className="text-ink text-[15px] font-medium">افکت شیشه‌ای</div>
            <div className="text-ink-muted text-xs mt-0.5 truncate">
              {liquidGlassEnabled
                ? 'Liquid Glass فعال است'
                : 'حالت مات (بدون شکست نور)'}
              {hardware ? ` · سخت‌افزار: ${hardware === 'strong' ? 'قوی' : 'ضعیف'}` : ''}
            </div>
          </div>
        </div>
        <span
          className={`relative inline-flex h-7 w-12 items-center rounded-full border border-hairline/15 px-0.5 transition-colors ${
            liquidGlassEnabled ? 'bg-npurple-borders/30' : 'bg-surface-muted'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-npurple-borders shadow transition-transform ${
              liquidGlassEnabled ? 'translate-x-0' : '-translate-x-5'
            }`}
          />
        </span>
      </button>
    </LiquidGlass>
  );
}
