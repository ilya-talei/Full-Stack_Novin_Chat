export default function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 w-full rounded',
    circle: 'rounded-full',
    card: 'h-20 w-full rounded-2xl',
  };

  return (
    <div className={`animate-pulse bg-surface-muted ${variants[variant]} ${className}`} />
  );
}
