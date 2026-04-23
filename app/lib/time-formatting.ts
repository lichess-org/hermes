/**
 * Parse SQLite `datetime('now')` and similar stored strings to `Date`
 * (naive "YYYY-MM-DD HH:MM:SS" treated as UTC for stable display).
 */
export function parseStoredDate(value: string): Date {
  if (!value?.trim()) {
    return new Date(NaN);
  }
  const s = value.trim();
  if (s.includes("T")) {
    return new Date(s);
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(" ", "T") + "Z");
  }
  return new Date(s);
}

export function formatFullTimestamp(value: string): string {
  const d = parseStoredDate(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
}

/**
 * e.g. "2 days ago" (Intl.RelativeTimeFormat, "en" / numeric: auto)
 */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const d = parseStoredDate(value);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const diffSec = (now.getTime() - d.getTime()) / 1000;
  if (diffSec < 0) {
    return "just now";
  }
  if (diffSec < 60) {
    return "just now";
  }
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffSec < 3600) {
    return rtf.format(-Math.floor(diffSec / 60), "minute");
  }
  if (diffSec < 86400) {
    return rtf.format(-Math.floor(diffSec / 3600), "hour");
  }
  if (diffSec < 86400 * 7) {
    return rtf.format(-Math.floor(diffSec / 86400), "day");
  }
  if (diffSec < 86400 * 30) {
    return rtf.format(-Math.floor(diffSec / (86400 * 7)), "week");
  }
  if (diffSec < 86400 * 365) {
    return rtf.format(-Math.floor(diffSec / (86400 * 30)), "month");
  }
  return rtf.format(-Math.floor(diffSec / (86400 * 365)), "year");
}
