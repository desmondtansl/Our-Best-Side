import JWT from "jsonwebtoken";
import User from "./models/User.js";

export const TOKEN_SECONDS = 24 * 60 * 60;

// A login token. `v` is the account's token version: "Log out of all
// devices" raises it, which makes every earlier token stop working.
export const signToken = (user) =>
  JWT.sign({ email: user.email, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_SECONDS,
  });

// The email of a valid, current token's account, or null.
export const verifyToken = async (token) => {
  if (!token) return null;
  let payload;
  try {
    payload = JWT.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
  if (typeof payload?.email !== "string") return null;
  const user = await User.findOne({ email: payload.email }, "tokenVersion");
  if (!user || (user.tokenVersion || 0) !== (payload.v || 0)) return null;
  return payload.email;
};

// "Bearer <token>" -> "<token>".
export const tokenFrom = (req) => {
  const header = req.header("Authorization");
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
};
