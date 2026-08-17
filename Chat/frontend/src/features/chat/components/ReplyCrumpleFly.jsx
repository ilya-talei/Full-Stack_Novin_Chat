import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DURATION_MS = 800;

function measureReplySlot() {
  const slot =
    document.querySelector('[data-reply-slot]') ||
    document.querySelector('[data-composer-root]');
  const rect = slot?.getBoundingClientRect();
  if (rect && rect.width > 8) {
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: Math.max(rect.height, 48),
    };
  }
  const pad = 16;
  return {
    left: Math.max(pad, window.innerWidth / 2 - 160),
    top: window.innerHeight - 132,
    width: Math.min(320, window.innerWidth - pad * 2),
    height: 52,
  };
}

/**
 * Reply launch:
 * 1) soft stretch
 * 2) compress
 * 3) glide down into the composer reply bar (no spin / no bounce)
 */
export default function ReplyCrumpleFly({ from, to: toProp, text, author, isMe = false, onDone }) {
  const ref = useRef(null);
  const trailRef = useRef(null);
  const doneRef = useRef(false);
  const [to, setTo] = useState(toProp);

  useEffect(() => {
    if (toProp) {
      setTo(toProp);
      return undefined;
    }
    let alive = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!alive) return;
        setTo(measureReplySlot());
      });
    });
    return () => {
      alive = false;
    };
  }, [toProp]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !from || !to) return undefined;

    doneRef.current = false;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone?.();
    };

    const x0 = from.left + from.width / 2;
    const y0 = from.top + from.height / 2;
    const x1 = to.left + to.width / 2;
    const y1 = to.top + to.height / 2;

    const w0 = Math.max(from.width, 72);
    const h0 = Math.min(Math.max(from.height, 40), 96);
    const w1 = Math.max(to.width, 160);
    const h1 = Math.max(to.height, 48);

    el.style.width = `${w0}px`;
    el.style.height = `${h0}px`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate3d(${x0 - w0 / 2}px, ${y0 - h0 / 2}px, 0)`;

    const dx = x1 - x0;
    const dy = y1 - y0;
    // Gentle lean toward destination only (no continuous spin)
    const leanDeg = Math.max(-14, Math.min(14, (Math.atan2(dx, Math.abs(dy) || 1) * 180) / Math.PI));

    const softEase = 'cubic-bezier(0.33, 0.05, 0.2, 1)';

    const anim = el.animate(
      [
        {
          transform: `translate3d(${x0 - w0 / 2}px, ${y0 - h0 / 2}px, 0) scale(1, 1) rotate(0deg)`,
          width: `${w0}px`,
          height: `${h0}px`,
          borderRadius: '1.15rem',
          filter: 'brightness(1)',
          opacity: 1,
          offset: 0,
        },
        // Soft stretch
        {
          transform: `translate3d(${x0 - w0 / 2}px, ${y0 - (h0 * 1.22) / 2}px, 0) scale(0.94, 1.22) rotate(0deg)`,
          width: `${w0}px`,
          height: `${h0}px`,
          borderRadius: '1.3rem',
          filter: 'brightness(1.04)',
          opacity: 1,
          offset: 0.14,
        },
        // Compress
        {
          transform: `translate3d(${x0 - (w0 * 0.78) / 2}px, ${y0 - (h0 * 0.78) / 2}px, 0) scale(0.78, 0.78) rotate(0deg)`,
          width: `${w0}px`,
          height: `${h0}px`,
          borderRadius: '1.1rem',
          filter: 'brightness(1.06)',
          opacity: 1,
          offset: 0.28,
        },
        // Start glide (slight lean)
        {
          transform: `translate3d(${x0 + dx * 0.18 - (w0 * 0.62) / 2}px, ${y0 + dy * 0.18 - (h0 * 0.62) / 2}px, 0) scale(0.62) rotate(${leanDeg}deg)`,
          width: `${w0 * 0.9}px`,
          height: `${h0 * 0.9}px`,
          borderRadius: '1rem',
          filter: 'brightness(1.05)',
          opacity: 1,
          offset: 0.42,
        },
        // Mid descent — still upright-ish, no spin
        {
          transform: `translate3d(${x0 + dx * 0.58 - (w1 * 0.72) / 2}px, ${y0 + dy * 0.58 - (h1 * 0.72) / 2}px, 0) scale(0.78) rotate(${leanDeg * 0.35}deg)`,
          width: `${w1 * 0.82}px`,
          height: `${h1 * 0.82}px`,
          borderRadius: '1rem',
          filter: 'brightness(1.02)',
          opacity: 0.92,
          offset: 0.72,
        },
        // Soft settle into reply bar (no overshoot / no rotate)
        {
          transform: `translate3d(${x1 - w1 / 2}px, ${y1 - h1 / 2}px, 0) scale(1) rotate(0deg)`,
          width: `${w1}px`,
          height: `${h1}px`,
          borderRadius: '1rem',
          filter: 'brightness(1)',
          opacity: 0,
          offset: 1,
        },
      ],
      {
        duration: DURATION_MS,
        easing: softEase,
        fill: 'forwards',
      }
    );

    const trail = trailRef.current;
    let trailAnim;
    if (trail) {
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      trailAnim = trail.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${x0}px, ${y0}px, 0) rotate(${angleDeg}deg) scaleY(0.15)`,
            offset: 0,
          },
          {
            opacity: 0,
            transform: `translate3d(${x0}px, ${y0}px, 0) rotate(${angleDeg}deg) scaleY(0.15)`,
            offset: 0.28,
          },
          {
            opacity: 0.35,
            transform: `translate3d(${x0 + dx * 0.4}px, ${y0 + dy * 0.4}px, 0) rotate(${angleDeg}deg) scaleY(0.85)`,
            offset: 0.55,
          },
          {
            opacity: 0,
            transform: `translate3d(${x0 + dx * 0.9}px, ${y0 + dy * 0.9}px, 0) rotate(${angleDeg}deg) scaleY(0.25)`,
            offset: 1,
          },
        ],
        {
          duration: DURATION_MS,
          easing: softEase,
          fill: 'forwards',
        }
      );
    }

    anim.onfinish = finish;
    const fallback = window.setTimeout(finish, DURATION_MS + 100);

    return () => {
      window.clearTimeout(fallback);
      anim.cancel();
      trailAnim?.cancel();
    };
  }, [from, to, onDone]);

  if (!from) return null;

  return createPortal(
    <>
      <div
        ref={trailRef}
        className="fixed top-0 left-0 z-[89] pointer-events-none origin-top"
        style={{
          width: 2,
          height: 36,
          marginLeft: -1,
          marginTop: -4,
          borderRadius: 999,
          background:
            'linear-gradient(180deg, rgba(147,197,253,0.0), rgba(147,197,253,0.55), rgba(255,255,255,0.1))',
          opacity: 0,
          visibility: to ? 'visible' : 'hidden',
        }}
        aria-hidden
      />
      <div
        ref={ref}
        className="reply-fly fixed top-0 left-0 z-[90] pointer-events-none overflow-hidden border border-hairline/[0.08]"
        style={{
          width: from.width,
          height: Math.min(Math.max(from.height, 40), 96),
          willChange: 'transform, width, height, opacity, border-radius',
          visibility: to ? 'visible' : 'hidden',
          background: isMe
            ? 'linear-gradient(135deg, rgba(139,122,232,0.96), rgba(111,95,208,0.96))'
            : 'rgb(var(--surface-panel))',
          color: isMe ? '#fff' : 'rgb(var(--ink))',
        }}
        aria-hidden
      >
        <div className="h-full flex items-stretch gap-2 px-3 py-2 min-w-0">
          <div
            className={`w-0.5 self-stretch rounded-full shrink-0 ${
              isMe ? 'bg-white/50' : 'bg-npurple-borders'
            }`}
          />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <p
              className={`text-[11px] font-medium truncate leading-4 ${
                isMe ? 'text-white/90' : 'text-npurple-borders'
              }`}
            >
              {author || 'پیام'}
            </p>
            <p
              className={`text-xs truncate mt-0.5 leading-4 ${
                isMe ? 'text-white/75' : 'text-ink-muted'
              }`}
            >
              {text}
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
