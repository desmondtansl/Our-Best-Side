import crypto from "node:crypto";
import RateCount from "./models/RateCount.js";

export const MINUTE = 60 * 1000;

// Ids (emails, addresses) are stored hashed, so the counts don't keep a list
// of who did what.
export const hash = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 32);

// The count for `name` + `id` in the current window of `windowMs`.
export const windowKey = (name, id, { windowMs }, now) => {
  const window = Math.floor(now / windowMs);
  return { key: `${name}:${hash(id)}:${window}`, expiresAt: new Date((window + 1) * windowMs) };
};

const secondsUntil = (date, now) => Math.max(1, Math.ceil((date.getTime() - now) / 1000));

// Adds one to a count and returns the new count.
export const increment = async ({ key, expiresAt }) => {
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
  try {
    const doc = await RateCount.findOneAndUpdate({ key }, update, { upsert: true, new: true });
    return doc.count;
  } catch (error) {
    // Two requests creating the same count at once: the other one won.
    if (error?.code !== 11000) throw error;
    const doc = await RateCount.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { new: true });
    return doc.count;
  }
};

export const countOf = async ({ key }) => (await RateCount.findOne({ key }, "count"))?.count || 0;

// Takes one off a count (e.g. a login that turned out to be correct).
export const decrement = ({ key }) =>
  RateCount.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });

export const clearCount = ({ key }) => RateCount.deleteOne({ key });

// Counts one request towards a limit; returns the seconds to wait if it's
// over the limit, or 0 if it's allowed.
export const takeOne = async (name, id, limit, now = Date.now()) => {
  const window = windowKey(name, id, limit, now);
  const count = await increment(window);
  return count > limit.max ? secondsUntil(window.expiresAt, now) : 0;
};

// Middleware limiting a route per visitor address, e.g. 10 sign-ups an hour.
// `respond(res, message)` lets a route keep its usual error format.
export const limitPerAddress = (name, limit, message, respond) => async (req, res, next) => {
  try {
    const wait = await takeOne(name, req.ip, limit);
    if (!wait) return next();
    res.set("Retry-After", String(wait));
    return respond
      ? respond(res.status(429), message)
      : res.status(429).json({ data: "", error: message });
  } catch (error) {
    return next(error);
  }
};

// A lighter limit for public pages (products, search, banners), counted in
// the server's memory instead of the database, so a flood of page views
// doesn't also flood the database. Counts reset when the server restarts,
// which is fine for this purpose.
export const memoryLimitPerAddress = (limit, message) => {
  const counts = new Map();
  let windowStart = 0;
  return (req, res, next) => {
    const now = Date.now();
    const window = Math.floor(now / limit.windowMs);
    if (window !== windowStart) {
      counts.clear();
      windowStart = window;
    }
    const count = (counts.get(req.ip) || 0) + 1;
    counts.set(req.ip, count);
    if (count <= limit.max) return next();
    res.set("Retry-After", String(secondsUntil(new Date((window + 1) * limit.windowMs), now)));
    return res.status(429).json({ data: "", error: message });
  };
};
