/**
 * Shared surface recipes for chrome (composer, nav, menus).
 * Liquid refraction is disabled; these drive the matte panel look.
 */
export const CHAT_INPUT_GLASS = {
  color: 'transparent',
  blur: 0,
  depth: 0,
  strength: 0,
  chromaticAberration: 0,
};

export function chatGlassOverlay(isDark) {
  return isDark ? 'rgb(20, 20, 22)' : 'rgb(255, 255, 255)';
}

export const CHAT_GLASS_ACCENT_OVERLAY = 'rgb(90, 148, 188)';
