import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import './media-players.css';

function formatClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Deterministic fake waveform bars from url seed */
function buildBars(seed, count = 28) {
  let h = 0;
  const str = String(seed || 'voice');
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const bars = [];
  for (let i = 0; i < count; i += 1) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = (h % 1000) / 1000;
    bars.push(0.22 + n * 0.78);
  }
  return bars;
}

export function VoicePlayer({ src, duration = 0, isMe = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const bars = useMemo(() => buildBars(src, 30), [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onTime = () => setCurrent(a.currentTime || 0);
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setTotal(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      a.currentTime = 0;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, [src]);

  const toggle = useCallback(
    (e) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        // pause other voice players
        document.querySelectorAll('audio[data-chat-voice]').forEach((el) => {
          if (el !== a) el.pause();
        });
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    },
    []
  );

  const seek = useCallback(
    (e) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a || !total) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      a.currentTime = ratio * total;
      setCurrent(a.currentTime);
    },
    [total]
  );

  const progress = total > 0 ? current / total : 0;

  return (
    <div
      className={`nv-voice ${isMe ? 'nv-voice--me' : 'nv-voice--other'}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={src} preload="metadata" data-chat-voice />
      <button
        type="button"
        className="nv-voice__play"
        onClick={toggle}
        aria-label={playing ? 'توقف' : 'پخش'}
      >
        {playing ? <FiPause size={18} /> : <FiPlay size={18} className="nv-voice__play-icon" />}
      </button>

      <div className="nv-voice__body">
        <button
          type="button"
          className="nv-voice__wave"
          onClick={seek}
          aria-label="جابه‌جایی"
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={`nv-voice__bar ${filled ? 'is-filled' : ''} ${playing ? 'is-live' : ''}`}
                style={{
                  height: `${Math.round(h * 100)}%`,
                  animationDelay: `${(i % 8) * 40}ms`,
                }}
              />
            );
          })}
        </button>
        <div className="nv-voice__meta">
          <span className="nv-voice__time tabular-nums">
            {playing || current > 0.2 ? formatClock(current) : formatClock(total || duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function VideoPlayer({ src, duration = 0, onOpen }) {
  const videoRef = useRef(null);
  const seekRef = useRef(null);
  const dragging = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => {
      if (!dragging.current) setCurrent(v.currentTime || 0);
    };
    const onMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) setTotal(v.duration);
      setReady(true);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      v.currentTime = 0;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('ended', onEnd);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('ended', onEnd);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [src]);

  const toggle = useCallback((e) => {
    e?.stopPropagation?.();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekToClientX = useCallback(
    (clientX) => {
      const el = seekRef.current;
      const v = videoRef.current;
      if (!el || !v || !total) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      v.currentTime = ratio * total;
      setCurrent(v.currentTime);
    },
    [total]
  );

  const onSeekPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    seekToClientX(e.clientX);
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);

    const onMove = (ev) => {
      if (!dragging.current) return;
      seekToClientX(ev.clientX);
    };
    const onUp = (ev) => {
      dragging.current = false;
      target.releasePointerCapture?.(ev.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      className={`nv-video ${playing ? 'is-playing' : ''}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`nv-video__frame ${onOpen ? 'cursor-zoom-in' : ''}`}
        onClick={(event) => {
          if (onOpen) {
            event.stopPropagation();
            onOpen();
          } else {
            toggle(event);
          }
        }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="nv-video__el"
        />
        {!ready ? <div className="nv-video__skeleton" aria-hidden /> : null}
      </div>

      <div className="nv-video__bar">
        <button
          type="button"
          className="nv-video__play"
          onClick={toggle}
          aria-label={playing ? 'توقف' : 'پخش'}
        >
          {playing ? <FiPause size={18} /> : <FiPlay size={18} className="nv-voice__play-icon" />}
        </button>

        <div className="nv-video__scrub">
          <button
            type="button"
            ref={seekRef}
            className="nv-video__seek"
            onPointerDown={onSeekPointerDown}
            aria-label="پیشرفت"
          >
            <span className="nv-video__track">
              <span className="nv-video__fill" style={{ width: `${progress}%` }} />
              <span className="nv-video__knob" style={{ left: `${progress}%` }} />
            </span>
          </button>
          <div className="nv-video__times">
            <span className="tabular-nums">{formatClock(current)}</span>
            <span className="tabular-nums">{formatClock(total || duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoNotePlayer({ src, duration = 0 }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => setCurrent(v.currentTime || 0);
    const onMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) setTotal(v.duration);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.play?.().catch(() => {});
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [src]);

  const progress = total > 0 ? current / total : 0;
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = c * progress;

  const toggle = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      v.muted = false;
      setMuted(false);
    }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div
      className="nv-vnote"
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg className="nv-vnote__ring" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} className="nv-vnote__ring-bg" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="nv-vnote__ring-fg"
          style={{
            strokeDasharray: `${dash} ${c}`,
          }}
        />
      </svg>
      <div className="nv-vnote__clip">
        <video
          ref={videoRef}
          src={src}
          playsInline
          loop
          muted={muted}
          autoPlay
          preload="metadata"
          className="nv-vnote__video"
        />
        {!playing ? (
          <span className="nv-vnote__pause">
            <FiPlay size={20} className="nv-voice__play-icon" />
          </span>
        ) : null}
      </div>
      <span className="nv-vnote__dur tabular-nums">
        {formatClock(playing || current > 0.2 ? current : total || duration)}
      </span>
    </div>
  );
}
