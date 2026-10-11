import TrustedDevice from "./models/TrustedDevice.js";
import { MINUTE, hash, windowKey, increment, decrement, clearCount, takeOne } from "./rateLimit.js";

// Three limits, each counted in fixed time windows:
// - account + address: login attempts for one account from one address.
//   The main protection against guessing a password; a correct password
//   clears it.
// - account: attempts for one account from anywhere, to stop guessing
//   spread over many addresses. Browsers that have logged in to the account
//   before ("trusted devices") aren't blocked by it, so someone typing wrong
//   passwords for an account can't lock its owner out. Accounts with
//   two-step login skip it: a guessed password alone doesn't get in.
// - address: every attempt from one address, whatever the account, to stop
//   one machine trying many accounts. Trusted devices aren't blocked by it
//   either, so one person on a shared connection (e.g. a mobile network)
//   can't lock everyone else on it out of their own accounts.
//
// Each attempt is counted before the password is checked, in one step per
// count, so attempts sent all at once are counted like attempts sent one
// after another.
export const LIMITS = {
  accountAddress: { max: 5, windowMs: 15 * MINUTE },
  account: { max: 20, windowMs: 60 * MINUTE },
  address: { max: 30, windowMs: 15 * MINUTE },
};

// Two-step login codes for one account: enough for a few typos, far too few
// to guess a 6-digit code.
export const TWO_FACTOR_LIMIT = { max: 5, windowMs: 15 * MINUTE };

const TRUSTED_FOR_MS = 90 * 24 * 60 * MINUTE;

export const TOO_MANY =
  "Too many login attempts. Please wait a few minutes and try again, or contact us if you've forgotten your password.";

const keysFor = (email, ip, now) => ({
  accountAddress: windowKey("account-address", `${email}|${ip}`, LIMITS.accountAddress, now),
  account: windowKey("account", email, LIMITS.account, now),
  address: windowKey("address", ip, LIMITS.address, now),
});

// A browser's device id: random text it keeps and sends with each login.
export const isDeviceId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{16,64}$/.test(value);

const deviceKey = (email, deviceId) => hash(`${email}|${deviceId}`);

const isTrusted = async (email, deviceId) =>
  isDeviceId(deviceId) && Boolean(await TrustedDevice.exists({ key: deviceKey(email, deviceId) }));

// Counts a login attempt. Returns the seconds until the earliest blocking
// limit resets, or 0 if the attempt is allowed. `twoFactor` is true for
// accounts with two-step login.
export const checkLogin = async (email, ip, deviceId, { twoFactor = false } = {}, now = Date.now()) => {
  const keys = keysFor(email, ip, now);
  const [address, accountAddress, account] = await Promise.all([
    increment(keys.address),
    increment(keys.accountAddress),
    increment(keys.account),
  ]);
  const counts = { address, accountAddress, account };
  let blocked = Object.keys(LIMITS).filter((name) => counts[name] > LIMITS[name].max);
  if (twoFactor) blocked = blocked.filter((name) => name !== "account");
  const trustedCanSkip = ["account", "address"];
  if (blocked.some((name) => trustedCanSkip.includes(name)) && (await isTrusted(email, deviceId))) {
    blocked = blocked.filter((name) => !trustedCanSkip.includes(name));
  }
  if (!blocked.length) return 0;
  const resetAt = Math.min(...blocked.map((name) => keys[name].expiresAt.getTime()));
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
};

// After a correct password: this address is cleared for this account, and
// the attempt no longer counts towards the account-wide limit.
export const recordSuccess = async (email, ip, now = Date.now()) => {
  const { accountAddress, account } = keysFor(email, ip, now);
  await Promise.all([clearCount(accountAddress), decrement(account)]);
};

// After a complete login (password, and the two-step code if the account has
// one): the browser becomes (or stays) a trusted device for 90 more days.
export const trustDevice = async (email, deviceId, now = Date.now()) => {
  if (!isDeviceId(deviceId)) return;
  await TrustedDevice.updateOne(
    { key: deviceKey(email, deviceId) },
    { $set: { expiresAt: new Date(now + TRUSTED_FOR_MS) } },
    { upsert: true }
  );
};

// Counts a two-step code attempt for an account. Returns the seconds to
// wait, or 0 if it's allowed.
export const checkTwoFactor = (email, now = Date.now()) =>
  takeOne("two-factor", email, TWO_FACTOR_LIMIT, now);

export const clearTwoFactor = (email, now = Date.now()) =>
  clearCount(windowKey("two-factor", email, TWO_FACTOR_LIMIT, now));
