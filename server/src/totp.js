import crypto from "node:crypto";

// Two-step login codes from an authenticator app (Google Authenticator,
// Microsoft Authenticator, 1Password, …): the standard 6-digit codes that
// change every 30 seconds (TOTP, RFC 6238).

const STEP_SECONDS = 30;
const DIGITS = 6;
// A code from the 30 seconds before or after is also accepted, for phones
// whose clock is slightly off.
const DRIFT_STEPS = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const toBase32 = (buffer) => {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    output += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return output;
};

const fromBase32 = (text) => {
  let bits = "";
  for (const char of text.replace(/=+$/, "").toUpperCase()) {
    const value = BASE32.indexOf(char);
    if (value === -1) throw new Error("Not base32");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
};

// A new secret for an authenticator app (160 random bits, as base32).
export const newSecret = () => toBase32(crypto.randomBytes(20));

// The address an authenticator app reads from the QR code.
export const otpauthUrl = (secret, email, issuer = "Our Best Side") =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}` +
  `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export const codeAt = (secret, step) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const number = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(number).padStart(DIGITS, "0");
};

const sameText = (a, b) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The time step a code belongs to, or null if it isn't valid now. Steps at
// or before `lastUsedStep` are refused, so a code can't be used twice.
export const matchingStep = (secret, code, lastUsedStep = -1, now = Date.now()) => {
  const text = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(text) || !secret) return null;
  const step = currentStep(now);
  for (let offset = -DRIFT_STEPS; offset <= DRIFT_STEPS; offset += 1) {
    const candidate = step + offset;
    if (candidate > lastUsedStep && sameText(codeAt(secret, candidate), text)) return candidate;
  }
  return null;
};

// One-time recovery codes, for when the phone with the authenticator app is
// lost. Only their hashes are stored. Codes look like "a1b2-c3d4-e5f6".
export const RECOVERY_CODE_COUNT = 10;

export const hashRecoveryCode = (code) =>
  crypto
    .createHash("sha256")
    .update(String(code).toLowerCase().replace(/[^a-f0-9]/g, ""))
    .digest("hex");

export const newRecoveryCodes = () =>
  Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    crypto.randomBytes(6).toString("hex").match(/.{4}/g).join("-")
  );

export const looksLikeRecoveryCode = (code) =>
  /^[a-f0-9]{12}$/i.test(String(code ?? "").replace(/[\s-]/g, ""));
