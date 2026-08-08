export const CUSTOM_WALLPAPER_KEY = 'novin_chat_wallpaper_image';

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.72;

export function getCustomWallpaper() {
  try {
    return localStorage.getItem(CUSTOM_WALLPAPER_KEY) || '';
  } catch {
    return '';
  }
}

export function clearCustomWallpaper() {
  try {
    localStorage.removeItem(CUSTOM_WALLPAPER_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('novin-wallpaper-change'));
}

/**
 * Compress an image File for local wallpaper storage (data URL).
 * @returns {Promise<string>} jpeg data URL
 */
export function compressWallpaperFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('فقط تصویر مجاز است'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('حجم تصویر بیش از حد مجاز است'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = img;
        const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشرده‌سازی ناموفق بود'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('خواندن تصویر ناموفق بود'));
    };
    img.src = url;
  });
}

export function saveCustomWallpaper(dataUrl) {
  if (!dataUrl) {
    clearCustomWallpaper();
    return;
  }
  try {
    localStorage.setItem(CUSTOM_WALLPAPER_KEY, dataUrl);
  } catch {
    throw new Error('ذخیره تصویر ممکن نیست (حافظه پر است)');
  }
  window.dispatchEvent(new Event('novin-wallpaper-change'));
}
