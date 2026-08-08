export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:bg-surface-muted transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
