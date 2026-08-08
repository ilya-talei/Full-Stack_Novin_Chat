export default function GlassPanel({
  children,
  className = '',
  as: Tag = 'div',
  variant = 'panel',
  ...props
}) {
  const variants = {
    panel: 'glass-panel',
    bar: 'glass-bar',
    card: 'glass-card',
    input: 'glass-input',
    bubble: 'glass-bubble',
    nav: 'glass-nav',
  };

  return (
    <Tag className={`${variants[variant] || variants.panel} ${className}`} {...props}>
      {children}
    </Tag>
  );
}
