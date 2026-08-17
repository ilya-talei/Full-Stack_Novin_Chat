import LiquidGlass from '@components/ui/LiquidGlass';
import { useTheme } from '@context/ThemeContext';
import { CHAT_INPUT_GLASS, chatGlassOverlay } from '@constants/glass';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  placement = 'center',
}) {
  const { isDark } = useTheme();
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  if (placement === 'list') {
    return (
      <div className="home-list-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="home-list-modal__backdrop"
          aria-label="بستن"
          onClick={onClose}
        />
        <LiquidGlass
          fill
          className="home-list-modal__panel relative w-full rounded-[1.25rem] border border-hairline/[0.08]"
          contentClassName="app-modal__content flex-col items-stretch"
          {...CHAT_INPUT_GLASS}
          overlay={chatGlassOverlay(isDark)}
        >
          <div className="app-modal__body home-list-modal__body p-6 w-full">
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

  return (
    <div
      className={`app-modal app-modal--${placement} fixed inset-0 z-50 flex items-center justify-center p-4`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <LiquidGlass
        fill
        className={`app-modal__panel relative w-full ${sizes[size]} rounded-2xl border border-hairline/[0.08]`}
        contentClassName="app-modal__content flex-col items-stretch"
        {...CHAT_INPUT_GLASS}
        overlay={chatGlassOverlay(isDark)}
      >
        <div className="app-modal__body p-6 w-full">
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
