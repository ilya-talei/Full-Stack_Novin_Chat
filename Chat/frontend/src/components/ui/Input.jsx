export default function Input({
  label,
  error,
  icon,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-start mb-1 text-ink text-sm">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
            {icon}
          </span>
        )}
        <input
          className={`w-full py-3 bg-surface-muted border rounded-xl border-hairline/15 hover:border-npurple-borders focus:border-npurple-borders focus:ring-[2px] focus:ring-npurple-borders/40 focus:outline-none text-ink placeholder:text-ink-muted px-3 ${icon ? 'pr-10' : ''} ${error ? 'border-nerror' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-nerror text-sm mt-1">{error}</p>}
    </div>
  );
}
