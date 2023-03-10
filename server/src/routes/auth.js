import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";
import checkAuth from "../middleware/checkAuth.js";

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

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({
      data: "",
      error: [
        {
          message: "Invalid credentials",
        },
      ],
    });
  }
  try {
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        data: "",
        error: [
          {
            message: "Invalid credentials",
          },
        ],
      });
    }

    const token = await JWT.sign(
      { email: user.email, isAdmin: user.isAdmin },
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
          isAdmin: user.isAdmin,
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
          email: user.email,
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
