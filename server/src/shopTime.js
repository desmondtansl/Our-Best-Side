// The shop's days run midnight to midnight Singapore time (UTC+8, no
// daylight saving), not UTC.
export const DAY = 24 * 60 * 60 * 1000;
const SHOP_UTC_OFFSET = 8 * 60 * 60 * 1000;

// Midnight, Singapore time, at the start of the day containing `date`.
export const shopDayStart = (date) => {
  const shopTime = date.getTime() + SHOP_UTC_OFFSET;
  return new Date(Math.floor(shopTime / DAY) * DAY - SHOP_UTC_OFFSET);
};

// Midnight, Singapore time, at the start of a "YYYY-MM-DD" date, or null if
// it isn't a real date.
export const parseShopDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const check = new Date(utcMidnight);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return new Date(utcMidnight - SHOP_UTC_OFFSET);
};
