/** Exact LiquidGlass recipe — softer for long sessions. */
export const CHAT_INPUT_GLASS = {
  color: 'transparent',
  blur: 2.4,
  depth: 8,
  strength: 36,
  chromaticAberration: 0.2,
};

export function chatGlassOverlay(isDark) {
  return isDark ? 'rgba(20,22,26,0.2)' : 'rgba(255,255,255,0.28)';
}

export const CHAT_GLASS_ACCENT_OVERLAY = 'rgba(90, 148, 188, 0.62)';
