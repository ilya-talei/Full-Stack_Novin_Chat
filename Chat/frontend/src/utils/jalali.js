export function toJalaliDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
