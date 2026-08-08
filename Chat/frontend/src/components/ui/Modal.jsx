import LiquidGlass from '@components/ui/LiquidGlass';
import { useTheme } from '@context/ThemeContext';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <LiquidGlass
        fill
        className={`relative w-full ${sizes[size]} rounded-3xl shadow-2xl`}
        contentClassName="flex-col items-stretch"
        {...CHAT_INPUT_GLASS}
        overlay={chatGlassOverlay(isDark)}
      >
        <div className="p-6 w-full">
          {title && (
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {children}
        </div>
      </LiquidGlass>
    </div>
  );
}
