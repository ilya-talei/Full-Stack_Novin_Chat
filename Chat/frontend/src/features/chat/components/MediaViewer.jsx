import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import './media-players.css';

export default function MediaViewer({ media, onClose }) {
  useEffect(() => {
    if (!media) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [media, onClose]);

  if (!media) return null;

  const isVideo = media.type === 'video' || media.type === 'videonote';

  return createPortal(
    <div
      className="media-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={isVideo ? 'نمایش ویدیو' : 'نمایش عکس'}
      onClick={onClose}
    >
      <button
        type="button"
        className="media-viewer__close"
        onClick={onClose}
        aria-label="بستن"
      >
        <FiX size={24} />
      </button>

      <div className="media-viewer__content" onClick={(event) => event.stopPropagation()}>
        {isVideo ? (
          <video
            src={media.url}
            className="media-viewer__media"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={media.url}
            alt={media.type === 'gif' ? 'گیف' : 'عکس'}
            className="media-viewer__media"
          />
        )}
      </div>
    </div>,
    document.body
  );
}
