export function TgIcon({ color = '#3390EC', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] text-white shrink-0 ${className}`}
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

export function TgSection({ children, footer, className = '' }) {
  return (
    <div className={`mb-5 ${className}`}>
      <div className="mx-4 overflow-hidden rounded-[12px] bg-[rgb(var(--surface-elevated))] border border-hairline/[0.06]">
        {children}
      </div>
      {footer ? (
        <p className="mx-5 mt-2 text-[13px] leading-[18px] text-ink-muted">{footer}</p>
      ) : null}
    </div>
  );
}

export function TgCell({
  icon,
  title,
  subtitle,
  value,
  onClick,
  chevron = true,
  danger = false,
  right,
  last = false,
  disabled = false,
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3.5 min-h-[48px] text-right transition-colors ${
        onClick && !disabled ? 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:bg-black/[0.06] dark:active:bg-white/[0.06]' : ''
      } ${disabled ? 'opacity-50' : ''} ${!last ? 'border-b border-hairline/[0.08]' : ''}`}
    >
      {icon}
      <div className="flex-1 min-w-0 py-2.5">
        <div className={`text-[16px] leading-[21px] truncate ${danger ? 'text-[#E53935]' : 'text-ink'}`}>
          {title}
        </div>
        {subtitle ? (
          <div className="text-[13px] leading-[17px] text-ink-muted mt-0.5 truncate">{subtitle}</div>
        ) : null}
      </div>
      {value != null && value !== '' ? (
        <span className="text-[15px] text-ink-muted shrink-0 max-w-[42%] truncate">{value}</span>
      ) : null}
      {right}
      {chevron && onClick ? (
        <svg width="8" height="14" viewBox="0 0 8 14" className="text-ink-muted/70 shrink-0 ml-0.5" aria-hidden>
          <path d="M7 1L1 7l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </Comp>
  );
}

export function TgToggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${
        checked ? 'bg-[#34C759]' : 'bg-[#787880]/36] dark:bg-[#787880]/52'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform ${
          checked ? 'right-[2px]' : 'right-[22px]'
        }`}
      />
    </button>
  );
}

export function TgNavHeader({ title, onBack, right }) {
  return (
    <div className="sticky top-0 z-30 bg-[rgb(var(--surface-panel))]/92 backdrop-blur-xl border-b border-hairline/[0.08]">
      <div className="h-[52px] px-2 flex items-center gap-1">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-0.5 px-2 py-2 text-[#3390EC] text-[17px]"
          >
            <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden>
              <path d="M10 1L2 9l8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>بازگشت</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
        <h1 className="flex-1 text-center text-[17px] font-semibold text-ink truncate px-1">{title}</h1>
        <div className="min-w-[64px] flex justify-end items-center px-1">{right}</div>
      </div>
    </div>
  );
}

export function TgRadioRow({ title, selected, onSelect, last = false }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-right hover:bg-black/[0.04] dark:hover:bg-white/[0.04] ${
        !last ? 'border-b border-hairline/[0.08]' : ''
      }`}
    >
      <span
        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? 'border-[#3390EC]' : 'border-ink-muted/40'
        }`}
      >
        {selected ? <span className="w-[12px] h-[12px] rounded-full bg-[#3390EC]" /> : null}
      </span>
      <span className="text-[16px] text-ink flex-1">{title}</span>
    </button>
  );
}

export function TgSlider({ value, min = 12, max = 30, onChange }) {
  return (
    <div className="px-4 py-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#3390EC]"
      />
      <div className="flex justify-between text-[13px] text-ink-muted mt-1">
        <span>{min}</span>
        <span className="text-ink font-medium">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
