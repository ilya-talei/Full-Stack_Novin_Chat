import { useEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { FiMoon, FiSun, FiX } from 'react-icons/fi';

/**
 * Strong iPhone-style Dynamic Island with spring morph.
 */
export default function DynamicIsland({
  title,
  subtitle,
  countLabel,
  search,
  onSearchChange,
  searchPlaceholder = 'جستجو...',
  isDark,
  onToggleTheme,
}) {
  const [expanded, setExpanded] = useState(true);
  const [bump, setBump] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const morph = (next) => {
    setBump(true);
    setExpanded(next);
    window.setTimeout(() => setBump(false), 520);
  };

  useEffect(() => {
    if (!expanded) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target) && !String(search || '').trim()) {
        morph(false);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [expanded, search]);

  useEffect(() => {
    if (!expanded) return undefined;
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 320);
    return () => window.clearTimeout(t);
  }, [expanded]);

  return (
    <div className="di-stage" ref={rootRef}>
      <div
        className={[
          'di-island',
          expanded ? 'is-expanded' : 'is-compact',
          bump ? 'is-bump' : '',
        ].join(' ')}
      >
        <div className="di-glow" aria-hidden />
        <div className="di-specular" aria-hidden />

        {!expanded ? (
          <button
            type="button"
            className="di-compact"
            onClick={() => morph(true)}
            aria-label="باز کردن داینامیک آیلند"
          >
            <span className="di-live">
              <span className="di-live-ring" />
              <span className="di-live-core" />
            </span>
            <span className="di-compact-text">{subtitle || title}</span>
            <span className="di-eq" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
            {countLabel != null ? <span className="di-pill">{countLabel}</span> : null}
          </button>
        ) : (
          <div className="di-expanded">
            <div className="di-top">
              <div className="di-titles">
                <p className="di-sub">{subtitle}</p>
                <h1 className="di-title">{title}</h1>
              </div>
              <div className="di-actions">
                {countLabel != null ? <span className="di-pill di-pill--lg">{countLabel}</span> : null}
                <button
                  type="button"
                  className="di-btn"
                  onClick={onToggleTheme}
                  aria-label={isDark ? 'حالت روشن' : 'حالت تاریک'}
                >
                  {isDark ? <FiSun size={15} /> : <FiMoon size={15} />}
                </button>
                <button
                  type="button"
                  className="di-btn"
                  onClick={() => morph(false)}
                  aria-label="جمع کردن"
                >
                  <FiX size={15} />
                </button>
              </div>
            </div>

            <label className="di-search">
              <FaSearch size={12} className="di-search-ico" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="di-search-input"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
