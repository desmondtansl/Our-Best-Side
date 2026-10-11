import express from "express";
import User, { isAdmin } from "../models/User.js";
import bcrypt from "bcryptjs";
import { signToken } from "../tokens.js";
import { passwordProblem } from "../passwords.js";
import { limitPerAddress, MINUTE } from "../rateLimit.js";
import checkAuth from "../middleware/checkAuth.js";
import { internalError, SOMETHING_WENT_WRONG } from "../errors.js";
import { checkLogin, recordFailure, recordSuccess, TOO_MANY } from "../loginLimits.js";

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
    const token = signToken(newUser);
    return res.json({
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
        },
      },
      error: [],
    });
  } catch (error) {
    // Two sign-ups for the same email at once: the second one loses.
    if (error?.code === 11000) return signupError(res, "Email already in use");
    return internalError(res, error, "Sign-up");
  }
});

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

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
    // Too many attempts: refused before the password is even checked, with
    // the same message whether or not the account exists.
    const deviceId = req.body?.deviceId;
    const waitSeconds = await checkLogin(email, req.ip, deviceId);
    if (waitSeconds) {
      res.set("Retry-After", String(waitSeconds));
      return res.status(429).json({ data: "", error: [{ message: TOO_MANY }] });
    }

    const user = email ? await User.findOne({ email }) : null;
    // Unknown emails are checked against a dummy hash, so they take as long
    // as known ones and the timing doesn't reveal who has an account.
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !isMatch) {
      await recordFailure(email, req.ip);
      return invalidCredentials(res);
    }
    await recordSuccess(email, req.ip, deviceId);

    const token = signToken(user);

    return res.status(200).json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          isAdmin: isAdmin(user),
          isOwner: Boolean(user.isOwner),
        },
      },
      error: "",
    });
  } catch (error) {
    console.error("Login failed:", error?.stack || error?.message);
    return res.status(500).json({ data: "", error: [{ message: SOMETHING_WENT_WRONG }] });
  }
});

router.get("/user", checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user) return res.status(403).json({ data: "", error: "Unauthorized" });
    return res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          isAdmin: isAdmin(user),
          isOwner: Boolean(user.isOwner),
        },
      },
      errors: "",
    });
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

export default router;
