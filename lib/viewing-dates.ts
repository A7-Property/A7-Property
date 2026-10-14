export interface ViewingDateOption {
  value: string;
  englishLabel: string;
  myanmarLabel: string;
}

/** Viewing slots are Myanmar wall-clock times, regardless of the viewer's device timezone. */
export function viewingTimeIso(date: string, time: string) {
  const parts = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parts || Number(parts[1]) < 1 || Number(parts[1]) > 12 || Number(parts[2]) > 59) {
    throw new RangeError("Invalid viewing date or time");
  }
  const hour = Number(parts[1]) % 12 + (parts[3] === "PM" ? 12 : 0);
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${parts[2]}:00+06:30`).toISOString();
}

export function getUpcomingViewingDates(now = new Date(), count = 3): ViewingDateOption[] {
  const yangonParts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Yangon",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(yangonParts.find((item) => item.type === type)?.value);
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const english = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const myanmar = new Intl.DateTimeFormat("my-MM", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return Array.from({ length: count }, (_, index) => {
    const viewingDate = new Date(Date.UTC(year, month - 1, day + index + 1));
    return {
      value: viewingDate.toISOString().slice(0, 10),
      englishLabel: english.format(viewingDate),
      myanmarLabel: myanmar.format(viewingDate),
    };
  });
}

export function viewingDateBadge(label: string) {
  const weekday = label.split(/[,\s]+/)[0] ?? "";
  const day = label.match(/\d+/)?.[0] ?? "—";
  return { day, weekday: weekday.slice(0, 3) };
}

export function isViewingDatePast(label: string, now = new Date()) {
  const yangonParts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Yangon",
  }).formatToParts(now);
  const currentPart = (type: Intl.DateTimeFormatPartTypes) => Number(yangonParts.find((item) => item.type === type)?.value);
  const today = Date.UTC(currentPart("year"), currentPart("month") - 1, currentPart("day"));

  const isoMatch = label.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])) < today;

  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const normalized = label.toLowerCase();
  const month = monthNames.findIndex((name) => normalized.includes(name) || normalized.includes(name.slice(0, 3)));
  const day = Number(label.match(/\b([1-9]|[12]\d|3[01])\b/)?.[1]);
  if (month < 0 || !day) return false;

  let candidate = Date.UTC(currentPart("year"), month, day);
  const sixMonths = 183 * 24 * 60 * 60 * 1000;
  if (candidate < today - sixMonths) candidate = Date.UTC(currentPart("year") + 1, month, day);
  return candidate < today;
}
