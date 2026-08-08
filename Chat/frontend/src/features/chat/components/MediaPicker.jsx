import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18nFa from '@emoji-mart/data/i18n/fa.json';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BsEmojiSmile } from 'react-icons/bs';
import { FiSearch } from 'react-icons/fi';
import { MdOutlineGifBox } from 'react-icons/md';
import { TbBackspace, TbSticker } from 'react-icons/tb';
import { useAuth } from '@context/AuthContext';
import { hasKlipyKey, klipyService } from '@services/klipyService';
import { getRecentEmojis, pushRecentEmoji } from '@utils/settingsRuntime';
import { appleEmojiData } from '../utils/appleEmojiSheet';
import { AppleEmoji } from './AppleEmoji';
import Spinner from '@components/ui/Spinner';

const data = appleEmojiData;

const TABS = [
  { id: 'emoji', label: 'ایموجی', Icon: BsEmojiSmile },
  { id: 'sticker', label: 'استیکر', Icon: TbSticker },
  { id: 'gif', label: 'گیف', Icon: MdOutlineGifBox },
];

const COLS = 7;
const ROW_H = 38;
const HEADER_H = 26;
const OVERSCAN = 8;
const EMOJI_SIZE = 26;

const CATEGORY_ICONS = {
  frequent: '🕒',
  people: '😀',
  nature: '🐻',
  foods: '🍔',
  activity: '⚽',
  places: '✈️',
  objects: '💡',
  symbols: '🔢',
  flags: '🏁',
};

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return v;
}

function appendCategoryRows(rows, id, title, items) {
  if (!items.length) return;
  rows.push({ type: 'header', key: `h-${id}`, id, title });
  for (let i = 0; i < items.length; i += COLS) {
    rows.push({
      type: 'row',
      key: `r-${id}-${i}`,
      id,
      items: items.slice(i, i + COLS),
    });
  }
}

function itemsFromIds(emojiIds, q) {
  const out = [];
  for (const eid of emojiIds) {
    const em = data.emojis?.[eid];
    const native = em?.skins?.[0]?.native;
    if (!native) continue;
    if (q) {
      const hay = `${em.id} ${em.name} ${(em.keywords || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q) && native !== q) continue;
    }
    out.push({ id: eid, native });
  }
  return out;
}

function buildRows(frequentNatives, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const rows = [];

  if (!q && frequentNatives.length) {
    const items = frequentNatives.map((native) => ({ id: null, native }));
    appendCategoryRows(
      rows,
      'frequent',
      i18nFa.categories?.frequent || 'پر استفاده‌ها',
      items
    );
  }

  for (const cat of data.categories || []) {
    if (cat.id === 'frequent') continue;
    appendCategoryRows(
      rows,
      cat.id,
      i18nFa.categories?.[cat.id] || cat.id,
      itemsFromIds(cat.emojis || [], q)
    );
  }

  return rows;
}

function VirtualEmojiGrid({ onEmojiSelect }) {
  const parentRef = useRef(null);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 200);
  const [frequent, setFrequent] = useState(() => getRecentEmojis().slice(0, 32));
  const [activeCat, setActiveCat] = useState('people');
  const activeCatRef = useRef(activeCat);
  activeCatRef.current = activeCat;

  const rows = useMemo(() => buildRows(frequent, debounced), [frequent, debounced]);

  const categoryIndex = useMemo(() => {
    const map = new Map();
    rows.forEach((row, i) => {
      if (row.type === 'header' && !map.has(row.id)) map.set(row.id, i);
    });
    return map;
  }, [rows]);

  const navCats = useMemo(() => {
    const list = [];
    if (frequent.length && !debounced.trim()) {
      list.push({ id: 'frequent', icon: CATEGORY_ICONS.frequent });
    }
    for (const cat of data.categories || []) {
      if (cat.id === 'frequent') continue;
      list.push({ id: cat.id, icon: CATEGORY_ICONS[cat.id] || '✨' });
    }
    return list;
  }, [frequent.length, debounced]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (rows[i]?.type === 'header' ? HEADER_H : ROW_H),
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!virtualItems.length) return;
    const first = rows[virtualItems[0].index];
    if (first?.id && first.id !== activeCatRef.current) {
      setActiveCat(first.id);
    }
  }, [virtualItems, rows]);

  const jumpToCategory = (id) => {
    const index = categoryIndex.get(id);
    if (index == null) return;
    setActiveCat(id);
    virtualizer.scrollToIndex(index, { align: 'start' });
  };

  const pick = (item) => {
    if (!item?.native) return;
    setFrequent(pushRecentEmoji(item.native)?.slice(0, 32) || getRecentEmojis().slice(0, 32));
    onEmojiSelect?.(item.native);
  };

  return (
    <div className="media-picker__emoji-virt">
      <div className="media-picker__cat-nav" role="tablist" aria-label="دسته‌ها">
        {navCats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCat === cat.id}
            className={`media-picker__cat-btn ${activeCat === cat.id ? 'is-active' : ''}`}
            onClick={() => jumpToCategory(cat.id)}
            title={i18nFa.categories?.[cat.id] || cat.id}
          >
            <AppleEmoji native={cat.icon} size={18} />
          </button>
        ))}
      </div>

      <div className="media-picker__search media-picker__search--pad">
        <FiSearch size={15} className="media-picker__search-ico" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18nFa.search || 'جستجو'}
          className="media-picker__search-input"
          dir="auto"
        />
      </div>

      <div ref={parentRef} className="media-picker__virt-scroll">
        <div
          className="media-picker__virt-inner"
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualItems.map((vRow) => {
            const row = rows[vRow.index];
            if (!row) return null;
            return (
              <div
                key={row.key}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                className={`media-picker__virt-row is-${row.type}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                {row.type === 'header' ? (
                  <div className="media-picker__section-title">{row.title}</div>
                ) : (
                  <div className="media-picker__emoji-row">
                    {row.items.map((item) => (
                      <button
                        key={`${row.key}-${item.id || item.native}`}
                        type="button"
                        className="media-picker__emoji-btn"
                        onClick={() => pick(item)}
                        aria-label={item.native}
                      >
                        <AppleEmoji id={item.id} native={item.native} size={EMOJI_SIZE} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!rows.length ? (
            <div className="media-picker__state">{i18nFa.search_no_results_2 || 'یافت نشد'}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const KlipyGrid = memo(function KlipyGrid({ kind, onSelect }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const customerId = user?.id != null ? String(user.id) : undefined;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const load = useCallback(async () => {
    if (!hasKlipyKey()) {
      setError('کلید KLIPY را در VITE_KLIPY_API_KEY قرار دهید');
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const q = debounced.trim();
      let list = [];
      if (kind === 'gif') {
        list = q
          ? await klipyService.searchGifs(q, { customerId })
          : await klipyService.trendingGifs({ customerId });
      } else {
        list = q
          ? await klipyService.searchStickers(q, { customerId })
          : await klipyService.trendingStickers({ customerId });
      }
      setItems(list);
    } catch (err) {
      setError(err?.message || 'بارگذاری ناموفق بود');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, debounced, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="media-picker__klipy">
      <div className="media-picker__search">
        <FiSearch size={15} className="media-picker__search-ico" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === 'gif' ? 'جستجوی گیف...' : 'جستجوی استیکر...'}
          className="media-picker__search-input"
          dir="auto"
        />
      </div>

      <div className="media-picker__grid-wrap">
        {loading ? (
          <div className="media-picker__state">
            <Spinner />
          </div>
        ) : error ? (
          <div className="media-picker__state media-picker__state--error">{error}</div>
        ) : items.length === 0 ? (
          <div className="media-picker__state">موردی پیدا نشد</div>
        ) : (
          <div className={`media-picker__grid ${kind === 'sticker' ? 'is-sticker' : 'is-gif'}`}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="media-picker__cell"
                onClick={() => onSelectRef.current?.(item)}
                title={item.title || kind}
              >
                <img
                  src={item.previewUrl || item.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function MediaPicker({ open, onClose, onEmojiSelect, onMediaSelect, onBackspace }) {
  const [tab, setTab] = useState('emoji');
  const rootRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const onEmojiSelectRef = useRef(onEmojiSelect);
  const onMediaSelectRef = useRef(onMediaSelect);
  const onBackspaceRef = useRef(onBackspace);
  onCloseRef.current = onClose;
  onEmojiSelectRef.current = onEmojiSelect;
  onMediaSelectRef.current = onMediaSelect;
  onBackspaceRef.current = onBackspace;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) onCloseRef.current?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleEmoji = useCallback((native) => {
    onEmojiSelectRef.current?.(native);
  }, []);

  const handleMedia = useCallback((item) => {
    onMediaSelectRef.current?.(item);
  }, []);

  const stopScrollBleed = useCallback((e) => {
    e.stopPropagation();
  }, []);

  if (!open) return null;

  return (
    <div
      className="media-picker"
      ref={rootRef}
      role="dialog"
      aria-label="انتخاب ایموجی و رسانه"
      onWheel={stopScrollBleed}
      onTouchMove={stopScrollBleed}
    >
      <div className="media-picker__body">
        {tab === 'emoji' ? (
          <VirtualEmojiGrid onEmojiSelect={handleEmoji} />
        ) : (
          <KlipyGrid kind={tab} onSelect={handleMedia} />
        )}
      </div>

      <div className="media-picker__dock">
        <div className="media-picker__tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`media-picker__tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
              aria-label={label}
              title={label}
            >
              {id === 'gif' ? <span className="media-picker__gif-label">GIF</span> : <Icon size={18} />}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="media-picker__backspace"
          onClick={() => onBackspaceRef.current?.()}
          aria-label="پاک کردن"
          title="پاک کردن"
        >
          <TbBackspace size={20} />
        </button>
      </div>
    </div>
  );
}

export default memo(MediaPicker);
