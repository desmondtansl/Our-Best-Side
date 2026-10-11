import crypto from "node:crypto";
import JWT from "jsonwebtoken";
import User from "./models/User.js";
import RevokedToken from "./models/RevokedToken.js";

export const TOKEN_SECONDS = 24 * 60 * 60;
// The time allowed between a correct password and the two-step code.
export const TWO_FACTOR_TICKET_SECONDS = 5 * 60;

// Two-step tickets are signed with their own key, so a ticket can never be
// used as a login token, or the other way round.
const ticketSecret = () => `${process.env.JWT_SECRET}:two-factor-ticket`;

// A login token. `v` is the account's token version: "Log out of all
// devices" (and a password change) raises it, which makes every earlier
// token stop working. `sid` identifies this login, so "Log out" can end it
// on its own.
export const signToken = (user) =>
  JWT.sign(
    { email: user.email, v: user.tokenVersion || 0, sid: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_SECONDS, algorithm: "HS256" }
  );

const readToken = (token) => {
  try {
    return JWT.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
};

// The email of a valid, current token's account, or null.
export const verifyToken = async (token) => {
  if (!token) return null;
  const payload = readToken(token);
  if (typeof payload?.email !== "string") return null;
  const user = await User.findOne({ email: payload.email }, "tokenVersion");
  if (!user || (user.tokenVersion || 0) !== (payload.v || 0)) return null;
  if (payload.sid && (await RevokedToken.exists({ sid: String(payload.sid) }))) return null;
  return payload.email;
};

// Ends one login ("Log out"): its token stops working, on the server too.
export const revokeToken = async (token) => {
  const payload = readToken(token);
  if (!payload?.sid || !payload.exp) return;
  await RevokedToken.updateOne(
    { sid: String(payload.sid) },
    { $setOnInsert: { expiresAt: new Date(payload.exp * 1000) } },
    { upsert: true }
  );
};

// After a correct password on an account with two-step login: a short-lived
// ticket the browser sends back with the code.
export const signTwoFactorTicket = (user) =>
  JWT.sign({ email: user.email, v: user.tokenVersion || 0 }, ticketSecret(), {
    expiresIn: TWO_FACTOR_TICKET_SECONDS,
    algorithm: "HS256",
  });

// The email of a valid two-step ticket, or null.
export const verifyTwoFactorTicket = (ticket) => {
  try {
    const payload = JWT.verify(String(ticket || ""), ticketSecret(), { algorithms: ["HS256"] });
    return typeof payload?.email === "string" ? payload : null;
  } catch (error) {
    return null;
  }
};

// "Bearer <token>" -> "<token>".
export const tokenFrom = (req) => {
  const header = req.header("Authorization");
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
};
