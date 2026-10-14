export function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function calculateAge(dateString?: string | null): string {
  if (!dateString) return "";
  const birthDate = new Date(dateString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

  return age.toString();
}

/**
 * A release / air date ("2026-10-09") in the visitor's language — "9 октомври
 * 2026 г.", "9 October 2026", … A bare year or anything unparseable comes back
 * as-is. Parsed as a calendar date (no time zone), so it never shifts a day.
 */
export function formatReleaseDate(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** A sortable timestamp for a release date — missing / unparseable dates sort last. */
export function releaseDateValue(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? -8.64e15 : time;
}
