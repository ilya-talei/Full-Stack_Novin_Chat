const variants = {
  primary: 'bg-npurple-borders hover:bg-[#5A97C6] text-white',
  secondary: 'bg-surface-muted hover:bg-surface-soft text-ink',
  outline: 'border border-hairline/[0.1] text-ink hover:bg-surface-muted',
  ghost: 'text-ink-secondary hover:bg-surface-muted',
  danger: 'bg-nerror hover:bg-red-700 text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-[15px] rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
  xl: 'px-6 py-3 text-lg rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
