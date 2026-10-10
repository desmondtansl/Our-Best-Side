import express from "express";
import { body, validationResult } from "express-validator";
import User, { isAdmin } from "../models/User.js";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import checkAuth from "../middleware/checkAuth.js";
import { checkLogin, recordFailure, recordSuccess, TOO_MANY } from "../loginLimits.js";

const router = express.Router();

router.post(
  "/signup",
  body("email").isEmail().withMessage("Invalid email"),
  body("password").isLength({ min: 8 }).withMessage("Invalid password"),
  async (req, res) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      const errors = validationErrors.array().map((error) => {
        return {
          msg: error.msg,
        };
      });
      return res.status(400).json({
        data: "",
        error: errors,
      });
    }
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        data: "",
        error: [
          {
            msg: "Email already in use",
          },
        ],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
    });

    const token = await JWT.sign(
      { email: newUser.email },
      process.env.JWT_SECRET,
      {
        expiresIn: 86400,
      }
    );
    res.json({
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
        },
      },
      error: [],
    });
  }
);

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
    const waitSeconds = await checkLogin(email, req.ip);
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
    await recordSuccess(email, req.ip);

    const token = await JWT.sign(
      { email: user.email, isAdmin: isAdmin(user) },
      process.env.JWT_SECRET,
      {
        expiresIn: 86400,
      }
    );

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
    return res.status(400).json({
      data: "",
      error: [
        {
          message: error.message,
        },
      ],
    });
  }
});

router.get("/user", checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user });
    console.log(user.email);
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
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

export default router;
