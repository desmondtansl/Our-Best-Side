import crypto from "node:crypto";
import LoginAttempt from "./models/LoginAttempt.js";

const MINUTE = 60 * 1000;

// Three limits, each counted in fixed time windows:
// - account + address: wrong passwords for one account from one address.
//   The main protection against guessing a password; a correct password
//   clears it. It never locks the real owner out from their own device.
// - account: wrong passwords for one account from anywhere, to stop
//   guessing spread over many addresses. Set higher, so someone else can't
//   easily lock an account by entering wrong passwords for it.
// - address: every attempt from one address, whatever the account, to stop
//   one machine trying many accounts.
export const LIMITS = {
  accountAddress: { max: 5, windowMs: 15 * MINUTE },
  account: { max: 20, windowMs: 60 * MINUTE },
  address: { max: 30, windowMs: 15 * MINUTE },
};

export const TOO_MANY =
  "Too many login attempts. Please wait a few minutes and try again, or contact us if you've forgotten your password.";

// Emails are stored hashed, so the counts don't keep a list of who tried.
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 32);

const windowKey = (name, id, { windowMs }, now) => {
  const window = Math.floor(now / windowMs);
  return { key: `${name}:${hash(id)}:${window}`, expiresAt: new Date((window + 1) * windowMs) };
};

const keysFor = (email, ip, now) => ({
  accountAddress: windowKey("account-address", `${email}|${ip}`, LIMITS.accountAddress, now),
  account: windowKey("account", email, LIMITS.account, now),
  address: windowKey("address", ip, LIMITS.address, now),
});

const countOf = async ({ key }) => (await LoginAttempt.findOne({ key }, "count"))?.count || 0;

const increment = ({ key, expiresAt }) =>
  LoginAttempt.updateOne(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true }
  ).catch((error) => {
    // Two requests creating the same count at once: the other one won.
    if (error?.code !== 11000) throw error;
    return LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
  });

// Seconds until the earliest blocking limit resets, or 0 if the attempt is
// allowed. Every attempt counts towards the address limit.
export const checkLogin = async (email, ip, now = Date.now()) => {
  const keys = keysFor(email, ip, now);
  await increment(keys.address);
  const counts = {
    accountAddress: await countOf(keys.accountAddress),
    account: await countOf(keys.account),
    address: await countOf(keys.address),
  };
  const blocked = Object.keys(LIMITS).filter((name) =>
    // The address count already includes this attempt.
    name === "address" ? counts[name] > LIMITS[name].max : counts[name] >= LIMITS[name].max
  );
  if (!blocked.length) return 0;
  const resetAt = Math.min(...blocked.map((name) => keys[name].expiresAt.getTime()));
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
};

// After a wrong password (or an unknown email).
export const recordFailure = async (email, ip, now = Date.now()) => {
  const keys = keysFor(email, ip, now);
  await Promise.all([increment(keys.accountAddress), increment(keys.account)]);
};

// After a correct password: this device is trusted again for this account.
export const recordSuccess = async (email, ip, now = Date.now()) => {
  const { accountAddress } = keysFor(email, ip, now);
  await LoginAttempt.deleteOne({ key: accountAddress.key });
};
