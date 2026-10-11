import bcrypt from "bcryptjs";
import User from "./models/User.js";
import { takeOne, MINUTE } from "./rateLimit.js";
import { matchingStep, looksLikeRecoveryCode, hashRecoveryCode } from "./totp.js";

// Checks a two-step code (from the authenticator app) or a one-time
// recovery code for a user. Each is accepted once: a code's time step is
// recorded and a recovery code is removed, in one step each, so the same
// code sent twice at once only works once. Returns "code", "recovery" or
// null.
export const useSecondFactor = async (userId, code) => {
  const user = await User.findById(userId).select(
    "+twoFactor.secret +twoFactor.lastUsedStep"
  );
  if (!user?.twoFactor?.enabled || !user.twoFactor.secret) return null;
  const lastUsedStep = user.twoFactor.lastUsedStep ?? -1;
  const step = matchingStep(user.twoFactor.secret, code, lastUsedStep);
  if (step !== null) {
    const result = await User.updateOne(
      {
        _id: userId,
        $or: [
          { "twoFactor.lastUsedStep": { $lt: step } },
          { "twoFactor.lastUsedStep": { $exists: false } },
        ],
      },
      { $set: { "twoFactor.lastUsedStep": step } }
    );
    return result.modifiedCount === 1 ? "code" : null;
  }
  if (looksLikeRecoveryCode(code)) {
    const hash = hashRecoveryCode(code);
    const result = await User.updateOne(
      { _id: userId, "twoFactor.recoveryCodes": hash },
      { $pull: { "twoFactor.recoveryCodes": hash } }
    );
    return result.modifiedCount === 1 ? "recovery" : null;
  }
  return null;
};

export const recoveryCodesLeft = async (userId) =>
  (await User.findById(userId).select("+twoFactor.recoveryCodes"))?.twoFactor?.recoveryCodes
    ?.length || 0;

// Password checks on account pages (changing the password, turning two-step
// login on or off): 5 tries per 15 minutes per account, so a logged-in
// device left open can't be used to guess the password.
const PASSWORD_CHECK_LIMIT = { max: 5, windowMs: 15 * MINUTE };

export const TOO_MANY_PASSWORD_TRIES =
  "Too many tries. Please wait a few minutes and try again.";

// Returns { ok } or { wait } (seconds) when there were too many tries.
export const confirmPassword = async (user, password) => {
  const wait = await takeOne("password-check", String(user._id), PASSWORD_CHECK_LIMIT);
  if (wait) return { wait };
  const ok = typeof password === "string" && (await bcrypt.compare(password, user.password));
  return { ok };
};
