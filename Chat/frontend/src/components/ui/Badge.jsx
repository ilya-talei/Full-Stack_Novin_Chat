export default function Badge({ children, variant = 'default', count }) {
  const variants = {
    default: 'bg-npurple-borders text-white',
    success: 'bg-nsuccess text-white',
    warning: 'bg-nwarning text-[#15171C]',
    error: 'bg-nerror text-white',
  };

  if (count !== undefined) {
    if (!count) return null;
    return (
      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${variants[variant]}`}>
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]}`}>
      {children}
    </span>
  );
}
