import TrustedDevice from "./models/TrustedDevice.js";
import { MINUTE, hash, windowKey, increment, countOf, clearCount } from "./rateLimit.js";

// Three limits, each counted in fixed time windows:
// - account + address: wrong passwords for one account from one address.
//   The main protection against guessing a password; a correct password
//   clears it.
// - account: wrong passwords for one account from anywhere, to stop
//   guessing spread over many addresses. Browsers that have logged in to the
//   account before ("trusted devices") aren't blocked by it, so someone
//   typing wrong passwords for an account can't lock its owner out.
// - address: every attempt from one address, whatever the account, to stop
//   one machine trying many accounts.
export const LIMITS = {
  accountAddress: { max: 5, windowMs: 15 * MINUTE },
  account: { max: 20, windowMs: 60 * MINUTE },
  address: { max: 30, windowMs: 15 * MINUTE },
};

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

// Seconds until the earliest blocking limit resets, or 0 if the attempt is
// allowed. Every attempt counts towards the address limit.
export const checkLogin = async (email, ip, deviceId, now = Date.now()) => {
  const keys = keysFor(email, ip, now);
  const counts = {
    address: await increment(keys.address),
    accountAddress: await countOf(keys.accountAddress),
    account: await countOf(keys.account),
  };
  const blocked = Object.keys(LIMITS).filter((name) =>
    // The address count already includes this attempt.
    name === "address" ? counts[name] > LIMITS[name].max : counts[name] >= LIMITS[name].max
  );
  if (blocked.includes("account") && (await isTrusted(email, deviceId))) {
    blocked.splice(blocked.indexOf("account"), 1);
  }
  if (!blocked.length) return 0;
  const resetAt = Math.min(...blocked.map((name) => keys[name].expiresAt.getTime()));
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
};

// After a wrong password (or an unknown email).
export const recordFailure = async (email, ip, now = Date.now()) => {
  const keys = keysFor(email, ip, now);
  await Promise.all([increment(keys.accountAddress), increment(keys.account)]);
};

// After a correct password: this address is cleared for this account, and
// the browser becomes (or stays) a trusted device for 90 more days.
export const recordSuccess = async (email, ip, deviceId, now = Date.now()) => {
  const { accountAddress } = keysFor(email, ip, now);
  await clearCount(accountAddress);
  if (isDeviceId(deviceId)) {
    await TrustedDevice.updateOne(
      { key: deviceKey(email, deviceId) },
      { $set: { expiresAt: new Date(now + TRUSTED_FOR_MS) } },
      { upsert: true }
    );
  }
};
