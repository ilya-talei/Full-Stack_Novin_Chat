const KLIPY_BASE = 'https://api.klipy.com/api/v1';

function getApiKey() {
  return String(import.meta.env.VITE_KLIPY_API_KEY || '').trim();
}

export function hasKlipyKey() {
  return Boolean(getApiKey());
}

function pickFileUrl(file, preferred = ['webp', 'gif', 'jpg', 'mp4']) {
  if (!file || typeof file !== 'object') return '';
  for (const fmt of preferred) {
    const url = file?.[fmt]?.url;
    if (url) return url;
  }
  for (const fmt of Object.keys(file)) {
    const url = file?.[fmt]?.url;
    if (url) return url;
  }
  return '';
}

function mapItem(item, kind) {
  const sizes = item?.file || item?.files || {};
  const preview =
    pickFileUrl(sizes.sm, ['webp', 'gif', 'jpg']) ||
    pickFileUrl(sizes.md, ['webp', 'gif', 'jpg']) ||
    pickFileUrl(sizes.hd, ['webp', 'gif', 'jpg']);
  const full =
    pickFileUrl(sizes.md, ['gif', 'webp', 'mp4']) ||
    pickFileUrl(sizes.hd, ['gif', 'webp', 'mp4']) ||
    pickFileUrl(sizes.sm, ['gif', 'webp', 'mp4']) ||
    preview;

  if (!full && !preview) return null;

  return {
    id: String(item.id ?? item.slug ?? full),
    slug: item.slug || '',
    title: item.title || '',
    kind, // 'gif' | 'sticker'
    url: full || preview,
    previewUrl: preview || full,
  };
}

function extractList(payload) {
  const root = payload?.data?.data ?? payload?.data ?? payload?.results ?? [];
  return Array.isArray(root) ? root : [];
}

async function klipyFetch(path, params = {}) {
  const key = getApiKey();
  if (!key) {
    throw new Error('کلید KLIPY تنظیم نشده است (VITE_KLIPY_API_KEY)');
  }

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === '') return;
    qs.set(k, String(v));
  });

  const url = `${KLIPY_BASE}/${encodeURIComponent(key)}/${path}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`KLIPY error ${res.status}`);
  }
  return res.json();
}

export const klipyService = {
  async trendingGifs({ page = 1, perPage = 24, locale = 'ir', customerId } = {}) {
    const json = await klipyFetch('gifs/trending', {
      page,
      per_page: perPage,
      locale,
      customer_id: customerId,
      content_filter: 'medium',
    });
    return extractList(json)
      .map((item) => mapItem(item, 'gif'))
      .filter(Boolean);
  },

  async searchGifs(q, { page = 1, perPage = 24, locale = 'ir', customerId } = {}) {
    const json = await klipyFetch('gifs/search', {
      q,
      page,
      per_page: perPage,
      locale,
      customer_id: customerId,
      content_filter: 'medium',
    });
    return extractList(json)
      .map((item) => mapItem(item, 'gif'))
      .filter(Boolean);
  },

  async trendingStickers({ page = 1, perPage = 24, locale = 'ir', customerId } = {}) {
    const json = await klipyFetch('stickers/trending', {
      page,
      per_page: perPage,
      locale,
      customer_id: customerId,
      content_filter: 'medium',
    });
    return extractList(json)
      .map((item) => mapItem(item, 'sticker'))
      .filter(Boolean);
  },

  async searchStickers(q, { page = 1, perPage = 24, locale = 'ir', customerId } = {}) {
    const json = await klipyFetch('stickers/search', {
      q,
      page,
      per_page: perPage,
      locale,
      customer_id: customerId,
      content_filter: 'medium',
    });
    return extractList(json)
      .map((item) => mapItem(item, 'sticker'))
      .filter(Boolean);
  },
};
