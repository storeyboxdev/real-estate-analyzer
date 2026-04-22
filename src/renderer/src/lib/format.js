export function fmtUsd(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtUsdDetailed(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function fmtPct(n, digits = 2) {
  if (!Number.isFinite(n)) return String(n);
  return (n * 100).toFixed(digits) + '%';
}

export function fmtNum(n, digits = 2) {
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(digits);
}

export function fmtDate(isoLike) {
  if (!isoLike) return '';
  // SQLite's datetime('now') produces "YYYY-MM-DD HH:MM:SS" in UTC.
  const d = new Date(isoLike.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return isoLike;
  return d.toLocaleString();
}
