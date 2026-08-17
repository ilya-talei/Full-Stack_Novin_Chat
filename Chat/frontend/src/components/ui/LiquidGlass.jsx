import { CHAT_INPUT_GLASS } from '@constants/glass';

/**
 * Clean matte panel used across chrome.
 * Liquid refraction was retired — it looked muddy on chat wallpapers.
 */
export default function LiquidGlass({
  children,
  className = '',
  contentClassName = '',
  button = false,
  inline = false,
  fill = false,
  overlay,
  style,
  // kept for call-site compatibility; unused
  depth = CHAT_INPUT_GLASS.depth,
  strength = CHAT_INPUT_GLASS.strength,
  chromaticAberration = CHAT_INPUT_GLASS.chromaticAberration,
  blur = CHAT_INPUT_GLASS.blur,
  color = CHAT_INPUT_GLASS.color,
  noMorph = false,
  displace = false,
}) {
  void depth;
  void strength;
  void chromaticAberration;
  void blur;
  void color;
  void noMorph;
  void displace;

  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      className={`matte-glass relative overflow-hidden ${
        fill ? 'w-full' : inline ? 'inline-flex align-middle' : ''
      } ${button ? 'matte-glass--btn cursor-pointer' : ''} ${className}`}
      style={style}
    >
      <Tag
        className="matte-glass-tint absolute inset-0 z-0 pointer-events-none"
        style={overlay ? { background: overlay } : undefined}
        aria-hidden
      />
      <Tag className={`relative z-[1] flex w-full ${contentClassName}`}>{children}</Tag>
    </Tag>
  );
}
