/** Preset chat wallpaper themes — low visual noise for long sessions. */
export const WALLPAPER_THEMES = [
  {
    id: 'default',
    title: 'پیش‌فرض',
    pattern: '/chat-pattern.svg',
    tile: '300px',
    base: { dark: '#16191e', light: '#e9ecf1' },
    tint: { dark: null, light: null },
    opacity: { dark: 0.18, light: 0.32 },
  },
  {
    id: 'soft',
    title: 'نرم',
    pattern: '/wallpapers/pattern-soft.svg',
    tile: '280px',
    base: { dark: '#171b24', light: '#e4ebf3' },
    tint: { dark: 'rgba(80,110,150,0.14)', light: 'rgba(150,180,210,0.18)' },
    opacity: { dark: 0.2, light: 0.36 },
  },
  {
    id: 'night',
    title: 'شب',
    pattern: '/wallpapers/pattern-night.svg',
    tile: '270px',
    base: { dark: '#12151c', light: '#d5dde8' },
    tint: { dark: 'rgba(10,18,36,0.28)', light: 'rgba(50,70,100,0.12)' },
    opacity: { dark: 0.22, light: 0.34 },
  },
  {
    id: 'mint',
    title: 'نعنایی',
    pattern: '/wallpapers/pattern-mint.svg',
    tile: '280px',
    base: { dark: '#141a18', light: '#e2efe9' },
    tint: { dark: 'rgba(40,110,95,0.16)', light: 'rgba(100,180,150,0.14)' },
    opacity: { dark: 0.2, light: 0.34 },
  },
  {
    id: 'grape',
    title: 'مه',
    pattern: '/wallpapers/pattern-grape.svg',
    tile: '280px',
    base: { dark: '#17161c', light: '#ebe8f0' },
    tint: { dark: 'rgba(90,80,120,0.16)', light: 'rgba(140,130,170,0.14)' },
    opacity: { dark: 0.2, light: 0.34 },
  },
  {
    id: 'dusk',
    title: 'غروب',
    pattern: '/wallpapers/pattern-dusk.svg',
    tile: '270px',
    base: { dark: '#1a1716', light: '#efe8e2' },
    tint: { dark: 'rgba(120,80,60,0.14)', light: 'rgba(200,150,120,0.14)' },
    opacity: { dark: 0.18, light: 0.32 },
  },
];

export function getWallpaperTheme(id) {
  return WALLPAPER_THEMES.find((t) => t.id === id) || WALLPAPER_THEMES[0];
}
