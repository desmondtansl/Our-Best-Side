import express from "express";
import User, { isAdmin, hasTwoFactor } from "../models/User.js";
import bcrypt from "bcryptjs";
import {
  signToken,
  revokeToken,
  tokenFrom,
  signTwoFactorTicket,
  verifyTwoFactorTicket,
} from "../tokens.js";
import { passwordProblem } from "../passwords.js";
import { limitPerAddress, MINUTE } from "../rateLimit.js";
import checkAuth from "../middleware/checkAuth.js";
import { internalError, SOMETHING_WENT_WRONG } from "../errors.js";
import {
  checkLogin,
  recordSuccess,
  trustDevice,
  checkTwoFactor,
  clearTwoFactor,
  TOO_MANY,
} from "../loginLimits.js";
import {
  useSecondFactor,
  recoveryCodesLeft,
  confirmPassword,
  TOO_MANY_PASSWORD_TRIES,
} from "../twoFactor.js";

const router = express.Router();

// Sign-ups per visitor address: plenty for a household, too few for a
// script creating accounts.
const signupLimit = limitPerAddress(
  "signup",
  { max: 10, windowMs: 60 * MINUTE },
  "Too many sign-ups from your connection. Please try again later.",
  (res, message) => res.json({ data: "", error: [{ msg: message }] })
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signupError = (res, msg) => res.status(400).json({ data: "", error: [{ msg }] });

router.post("/signup", signupLimit, async (req, res) => {
  try {
    // Only plain text is accepted: a list or an object is refused, never
    // passed on to the database.
    const rawEmail = req.body?.email;
    const password = req.body?.password;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return signupError(res, "Invalid email");
    }
    const problem = passwordProblem(password, email);
    if (problem) return signupError(res, problem);

    if (await User.exists({ email })) return signupError(res, "Email already in use");

    const newUser = await User.create({
      email,
      password: await bcrypt.hash(password, 10),
    });
    return res.json({
      data: { token: signToken(newUser), user: userSummary(newUser) },
      error: [],
    });
  } catch (error) {
    // Two sign-ups for the same email at once: the second one loses.
    if (error?.code === 11000) return signupError(res, "Email already in use");
    return internalError(res, error, "Sign-up");
  }
});

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// What the browser is told about the logged-in user.
export const userSummary = (user) => ({
  id: user.id,
  email: user.email,
  isAdmin: isAdmin(user),
  isOwner: Boolean(user.isOwner),
  twoFactorEnabled: hasTwoFactor(user),
});

const loggedIn = (res, user, extra = {}) =>
  res.status(200).json({
    data: { token: signToken(user), user: userSummary(user), ...extra },
    error: "",
  });

const invalidCredentials = (res) =>
  res.status(401).json({
    data: "",
    error: [
      {
        message: "Invalid credentials",
      },
    ],
  });

router.post("/login", async (req, res) => {
  // Always text, so a crafted request can't turn the email into a query.
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  try {
    const deviceId = req.body?.deviceId;
    const user = email ? await User.findOne({ email }) : null;
    // Too many attempts: refused before the password is even checked, with
    // the same message whether or not the account exists.
    const waitSeconds = await checkLogin(email, req.ip, deviceId, {
      twoFactor: hasTwoFactor(user),
    });
    if (waitSeconds) {
      res.set("Retry-After", String(waitSeconds));
      return res.status(429).json({ data: "", error: [{ message: TOO_MANY }] });
    }

    // Unknown emails are checked against a dummy hash, so they take as long
    // as known ones and the timing doesn't reveal who has an account.
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !isMatch) return invalidCredentials(res);
    await recordSuccess(email, req.ip);

    // Two-step login: the code comes next, with this short-lived ticket.
    if (hasTwoFactor(user)) {
      return res.status(200).json({
        data: { twoFactorRequired: true, ticket: signTwoFactorTicket(user) },
        error: "",
      });
    }
    await trustDevice(email, deviceId);
    return loggedIn(res, user);
  } catch (error) {
    console.error("Login failed:", error?.stack || error?.message);
    return res.status(500).json({ data: "", error: [{ message: SOMETHING_WENT_WRONG }] });
  }
});

// THE TWO-STEP CODE, after a correct password
// Body: { ticket, code, deviceId }. `code` is the 6-digit code from the
// authenticator app, or one of the recovery codes.

const twoFactorError = (res, status, message) =>
  res.status(status).json({ data: "", error: [{ message }] });

router.post("/login/two-factor", async (req, res) => {
  try {
    const ticket = verifyTwoFactorTicket(req.body?.ticket);
    const timedOut = () =>
      twoFactorError(res, 401, "Your login timed out. Please enter your password again.");
    if (!ticket) return timedOut();
    const waitSeconds = await checkTwoFactor(ticket.email);
    if (waitSeconds) {
      res.set("Retry-After", String(waitSeconds));
      return twoFactorError(res, 429, TOO_MANY);
    }
    const user = await User.findOne({ email: ticket.email });
    if (!user || !hasTwoFactor(user) || (user.tokenVersion || 0) !== (ticket.v || 0)) {
      return timedOut();
    }
    const used = await useSecondFactor(user._id, req.body?.code);
    if (!used) return twoFactorError(res, 401, "That code isn't right. Please try again.");
    await clearTwoFactor(ticket.email);
    await trustDevice(ticket.email, req.body?.deviceId);
    return loggedIn(
      res,
      user,
      used === "recovery" ? { recoveryCodesLeft: await recoveryCodesLeft(user._id) } : {}
    );
  } catch (error) {
    console.error("Two-step login failed:", error?.stack || error?.message);
    return twoFactorError(res, 500, SOMETHING_WENT_WRONG);
  }
});

router.get("/user", checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user) return res.status(403).json({ data: "", error: "Unauthorized" });
    return res.status(200).json({ data: { user: userSummary(user) }, errors: "" });
  } catch (error) {
    return internalError(res, error, "Loading the user");
  }
});

// LOG OUT OF ALL DEVICES
// Every login token for the account stops working, including this one.

router.post("/logout-all", checkAuth, async (req, res) => {
  try {
    await User.updateOne({ email: req.user }, { $inc: { tokenVersion: 1 } });
    return res.status(200).json({ data: { loggedOut: true }, error: "" });
  } catch (error) {
    return internalError(res, error, "Logging out everywhere");
  }
});

// LOG OUT (this device only)
// The token stops working on the server too, not just in this browser.

router.post("/logout", async (req, res) => {
  try {
    const token = tokenFrom(req);
    if (token) await revokeToken(token);
    return res.status(200).json({ data: { loggedOut: true }, error: "" });
  } catch (error) {
    return internalError(res, error, "Logging out");
  }
});

// CHANGE PASSWORD
// Body: { currentPassword, newPassword }. Every other device is logged out;
// this one gets a new token.

router.post("/change-password", checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user) return res.status(403).json({ data: "", error: "Unauthorized" });
    const { ok, wait } = await confirmPassword(user, req.body?.currentPassword);
    if (wait) {
      res.set("Retry-After", String(wait));
      return res.status(429).json({ data: "", error: TOO_MANY_PASSWORD_TRIES });
    }
    if (!ok) return res.status(400).json({ data: "", error: "Your current password isn't right" });
    const newPassword = req.body?.newPassword;
    const problem = passwordProblem(newPassword, user.email);
    if (problem) return res.status(400).json({ data: "", error: problem });
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ data: "", error: "Choose a password you haven't been using" });
    }
    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { password: await bcrypt.hash(newPassword, 10) }, $inc: { tokenVersion: 1 } },
      { new: true }
    );
    return loggedIn(res, updated);
  } catch (error) {
    return internalError(res, error, "Changing the password");
  }
});

export default router;
