import { FiCpu, FiZap } from 'react-icons/fi';
import { usePerformance } from '@context/PerformanceContext';

export default function HardwarePrompt() {
  const { needsHardwarePrompt, setHardware } = usePerformance();

  if (!needsHardwarePrompt) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-hairline/[0.1] bg-[rgb(var(--surface-panel))] p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-npurple-borders/15 text-npurple-borders flex items-center justify-center">
            <FiCpu size={26} />
          </div>
          <h2 className="text-ink text-xl font-semibold">قدرت سخت‌افزار</h2>
          <p className="text-ink-secondary text-sm mt-2 leading-7">
            برای اجرای روان‌تر، بگویید سخت‌افزار سیستم‌تان قوی است یا ضعیف. در حالت ضعیف، به‌جای Liquid
            Glass از ظاهر مات شیشه‌ای استفاده می‌شود.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setHardware('strong')}
            className="rounded-2xl border border-npurple-borders/35 bg-npurple-borders/10 hover:bg-npurple-borders/20 px-4 py-4 text-right transition-colors"
          >
            <div className="flex items-center gap-2 text-npurple-borders font-semibold mb-1">
              <FiZap size={18} />
              قوی
            </div>
            <p className="text-ink-muted text-xs leading-6">
              افکت شیشه‌ای آیفون فعال می‌شود
            </p>
          </button>

          <button
            type="button"
            onClick={() => setHardware('weak')}
            className="rounded-2xl border border-hairline/15 bg-surface-muted/50 hover:bg-surface-muted px-4 py-4 text-right transition-colors"
          >
            <div className="flex items-center gap-2 text-ink font-semibold mb-1">
              <FiCpu size={18} />
              ضعیف
            </div>
            <p className="text-ink-muted text-xs leading-6">
              ظاهر مات شیشه‌ای، بدون افکت سنگین
            </p>
          </button>
        </div>

        <p className="text-ink-muted text-[11px] text-center mt-5 leading-5">
          بعداً می‌توانید از بخش تنظیمات این گزینه را تغییر دهید.
        </p>
      </div>
    </div>
  );
}
