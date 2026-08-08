export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return formatTime(d);
  if (diffDays === 1) return 'دیروز';
  if (diffDays < 7) return `${diffDays} روز پیش`;
  return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
}

export function formatLastSeenStatus(lastSeenAt, online = false, nowTs = Date.now()) {
  if (online) return 'آنلاین';
  if (!lastSeenAt) return 'آخرین بازدید نامشخص';

  const seenTs =
    lastSeenAt instanceof Date
      ? lastSeenAt.getTime()
      : new Date(lastSeenAt).getTime();

  if (!Number.isFinite(seenTs)) return 'آخرین بازدید نامشخص';

  const diffMs = Math.max(0, nowTs - seenTs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs <= 2 * minuteMs) return 'آخرین بازدید به‌تازگی';

  if (diffMs < hourMs) {
    const m = Math.floor(diffMs / minuteMs);
    return `آخرین بازدید ${m.toLocaleString('fa-IR')} دقیقه پیش`;
  }

  if (diffMs < dayMs) {
    const h = Math.floor(diffMs / hourMs);
    return `آخرین بازدید ${h.toLocaleString('fa-IR')} ساعت پیش`;
  }

  const d = Math.floor(diffMs / dayMs);
  return `آخرین بازدید ${d.toLocaleString('fa-IR')} روز پیش`;
}
