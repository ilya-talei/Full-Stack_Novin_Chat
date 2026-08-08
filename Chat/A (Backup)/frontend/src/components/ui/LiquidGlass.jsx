import { useEffect, useRef } from 'react';
import {
  getDisplacementFilter,
  parseRadiusPx,
  supportsBackdropFilterUrl,
} from '@lib/liquidGlass';
import { CHAT_INPUT_GLASS } from '@constants/glass';
import { usePerformance } from '@context/PerformanceContext';

const canDisplaceCached =
  typeof window !== 'undefined' ? supportsBackdropFilterUrl() : false;

const filterCache = new Map();

function bucket(n, step = 8) {
  return Math.max(step, Math.ceil(n / step) * step);
}

function cachedDisplacementFilter(opts) {
  const key = `${opts.width}x${opts.height}|${opts.radius}|${opts.depth}|${opts.strength}|${opts.chromaticAberration}`;
  let url = filterCache.get(key);
  if (!url) {
    url = getDisplacementFilter(opts);
    if (filterCache.size > 48) {
      const first = filterCache.keys().next().value;
      filterCache.delete(first);
    }
    filterCache.set(key, url);
  }
  return url;
}

/** Lightweight frosted/matte glass — used when Liquid Glass is disabled. */
function MatteSurface({
  children,
  className = '',
  contentClassName = '',
  button = false,
  inline = false,
  fill = false,
  overlay,
  style,
}) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      className={`matte-glass relative overflow-hidden ${
        fill ? 'w-full' : inline ? 'inline-flex align-middle' : ''
      } ${button ? 'cursor-pointer' : ''} ${className}`}
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

/**
 * iOS-style liquid glass — defaults match the chat message input.
 * When disabled, falls back to a frosted matte surface (blur only, no refraction).
 */
export default function LiquidGlass(props) {
  const { liquidGlassEnabled } = usePerformance();

  if (!liquidGlassEnabled) {
    return <MatteSurface {...props} />;
  }

  return <LiquidGlassEffect {...props} />;
}

function LiquidGlassEffect({
  children,
  className = '',
  contentClassName = '',
  depth = CHAT_INPUT_GLASS.depth,
  strength = CHAT_INPUT_GLASS.strength,
  chromaticAberration = CHAT_INPUT_GLASS.chromaticAberration,
  blur = CHAT_INPUT_GLASS.blur,
  color = CHAT_INPUT_GLASS.color,
  button = false,
  inline = false,
  noMorph = false,
  fill = false,
  displace = true,
  overlay,
  style,
}) {
  const rootRef = useRef(null);
  const filterRef = useRef(null);
  const contentRef = useRef(null);
  const lastKey = useRef('');

  useEffect(() => {
    const glass = rootRef.current;
    const liquidGlass = filterRef.current;
    const content = contentRef.current;
    if (!glass || !liquidGlass || !content) return;

    let frame = 0;
    let debounceTimer = 0;

    const apply = () => {
      const rect = content.getBoundingClientRect();
      const rawW = Math.max(1, Math.round(rect.width));
      const rawH = Math.max(1, Math.round(rect.height));
      if (rawW < 2 || rawH < 2) return;

      const width = bucket(rawW);
      const height = bucket(rawH);
      const radius = Math.round(parseRadiusPx(glass));
      const saturate = button ? 1.25 : 1.45;
      const brightness = button ? 1.15 : 1.08;
      const useDisplace = displace && canDisplaceCached && !noMorph;

      const key = useDisplace
        ? `d|${width}x${height}|${radius}|${depth}|${strength}|${chromaticAberration}|${blur}`
        : `b|${width}x${height}|${blur}`;

      if (lastKey.current === key) return;
      lastKey.current = key;

      liquidGlass.style.height = `${rawH}px`;
      liquidGlass.style.width = `${rawW}px`;

      if (useDisplace) {
        liquidGlass.style.backdropFilter = `blur(${blur / 2}px) url('${cachedDisplacementFilter(
          {
            height,
            width,
            radius,
            depth,
            strength,
            chromaticAberration,
          }
        )}') blur(${blur}px) brightness(${brightness}) saturate(${saturate})`;
      } else {
        liquidGlass.style.backdropFilter = `blur(${blur}px) saturate(${saturate}) brightness(${brightness})`;
      }
      liquidGlass.style.webkitBackdropFilter = liquidGlass.style.backdropFilter;
    };

    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    const onResize = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(redraw, 60);
    };

    lastKey.current = '';
    redraw();

    const observer = new ResizeObserver(onResize);
    observer.observe(glass);
    observer.observe(content);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(debounceTimer);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [blur, button, chromaticAberration, depth, displace, noMorph, strength]);

  const Tag = inline ? 'span' : 'div';
  const tint = color ?? 'transparent';
  const overlayBg = overlay ?? 'rgba(255, 255, 255, 0.22)';

  return (
    <Tag
      ref={rootRef}
      className={`liquid-glass relative overflow-hidden ${fill ? 'w-full' : inline ? 'inline-flex align-middle' : ''} ${
        button ? 'liquid-glass-button cursor-pointer' : ''
      } ${className}`}
      style={style}
    >
      <Tag
        className="lg-overlay-bg absolute inset-0 z-[1] pointer-events-none"
        style={{ background: overlayBg }}
        aria-hidden
      />
      <Tag
        ref={contentRef}
        className={`lg-content relative z-[3] flex w-full ${contentClassName}`}
      >
        {children}
      </Tag>
      <Tag className="lg-filter-layer absolute inset-0 z-[2] pointer-events-none" aria-hidden>
        <Tag
          ref={filterRef}
          className={`glass-box m-0 glass-${tint}`}
          aria-hidden
        />
      </Tag>
    </Tag>
  );
}
