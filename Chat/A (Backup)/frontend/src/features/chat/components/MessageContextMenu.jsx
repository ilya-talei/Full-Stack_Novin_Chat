import { useLayoutEffect, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FiCopy,
  FiCornerUpLeft,
  FiCheckSquare,
  FiShare2,
  FiTrash2,
  FiEdit2,
  FiDownload,
} from 'react-icons/fi';
import {
  getMessagePreview,
  getMessageMedia,
  isDownloadableMedia,
} from '../utils/messageMeta';

const BASE_ACTIONS = [
  { id: 'reply', label: 'ریپلای', Icon: FiCornerUpLeft },
  { id: 'edit', label: 'ویرایش', Icon: FiEdit2, ownOnly: true },
  { id: 'download', label: 'دانلود', Icon: FiDownload },
  { id: 'forward', label: 'فوروارد', Icon: FiShare2 },
  { id: 'copy', label: 'کپی', Icon: FiCopy },
  { id: 'select', label: 'سلکت', Icon: FiCheckSquare },
  { id: 'delete', label: 'حذف', Icon: FiTrash2, danger: true, ownOnly: true },
];

function clampPosition(x, y, width, height) {
  const pad = 8;
  let left = x;
  let top = y;
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - width - pad);
  }
  if (top + height > window.innerHeight - pad) {
    top = Math.max(pad, window.innerHeight - height - pad);
  }
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  return { left, top };
}

export default function MessageContextMenu({
  open,
  x,
  y,
  message,
  canDelete = true,
  onAction,
  onClose,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const media = useMemo(
    () => (message ? getMessageMedia(message.text) : null),
    [message]
  );
  const downloadable = isDownloadableMedia(media);

  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) {
      setPos({ left: x, top: y });
      return;
    }
    const rect = el.getBoundingClientRect();
    setPos(clampPosition(x, y, rect.width, rect.height));
  }, [open, x, y, downloadable]);

  useEffect(() => {
    if (!open) return undefined;

    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    // Defer so the opening gesture (contextmenu / long-press) doesn't instantly close
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('touchstart', onDoc);
      document.addEventListener('keydown', onKey);
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !message) return null;

  const items = BASE_ACTIONS.filter((a) => {
    if (a.ownOnly && !canDelete) return false;
    if (a.id === 'edit') return !downloadable && canDelete;
    if (a.id === 'download') return downloadable;
    if (a.id === 'copy') return !downloadable;
    return true;
  });
  const preview = getMessagePreview(message.text, 42);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[80] min-w-[180px] rounded-2xl border border-hairline/10 bg-[rgb(var(--surface-panel))] shadow-[0_16px_40px_rgba(0,0,0,0.35)] overflow-hidden"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
    >
      {preview ? (
        <div className="px-3 py-2 border-b border-hairline/10">
          <p className="text-[11px] text-ink-muted truncate max-w-[200px]" dir="auto">
            {preview}
          </p>
        </div>
      ) : null}
      <div className="py-1">
        {items.map(({ id, label, Icon, danger }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              onAction?.(id, message);
              onClose?.();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-right transition-colors ${
              danger
                ? 'text-nerror hover:bg-nerror/10'
                : 'text-ink hover:bg-white/10'
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
