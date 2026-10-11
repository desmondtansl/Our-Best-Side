import express from "express";
import { logActivity } from "../activity.js";
import AdminActivity from "../models/AdminActivity.js";
import { internalError } from "../errors.js";
import User from "../models/User.js";
import AdminAccessLog from "../models/AdminAccessLog.js";
import checkAuth from "../middleware/checkAuth.js";
import requireOwner from "../middleware/requireOwner.js";

const router = express.Router();

// Only the shop owner can see or change who has admin access.
router.use(checkAuth, requireOwner);

const normalise = (email) => String(email || "").trim().toLowerCase();

const listAdmins = () =>
  User.find({ $or: [{ isAdmin: true }, { isOwner: true }] }, "email isOwner createdAt").sort({
    isOwner: -1,
    email: 1,
  });

const recentChanges = () => AdminAccessLog.find().sort({ createdAt: -1, _id: -1 }).limit(10);

const respond = async (res) =>
  res.status(200).json({
    data: { admins: await listAdmins(), log: await recentChanges() },
    error: "",
  });

// ADMIN ACTIVITY: the last 100 actions by any admin, newest first.

router.get("/activity", async (req, res) => {
  try {
    const activity = await AdminActivity.find().sort({ createdAt: -1, _id: -1 }).limit(100);
    return res.status(200).json({ data: activity, error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

// CONNECTION CHECK
// What the server sees as the owner's internet address, and whether the
// TRUST_PROXY_HOPS setting looks right:
// - "ok": the address comes from the proxies in front of the server.
// - "too-high": the server trusts more proxies than added addresses to the
//   request, so a visitor could make up their own address and get past
//   every limit.
// - "too-low": the address is a proxy's (a private address), so every
//   visitor may look like the same address and share the limits.

const IPV4_INTERNAL = [
  [10, 0, 8], [127, 0, 8], [169, 254, 16], [172, 16, 12], [192, 168, 16], [100, 64, 10],
];

export const isInternalAddress = (raw) => {
  const ip = String(raw || "").trim().toLowerCase().replace(/^::ffff:/, "");
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip);
  if (v4) {
    const value = v4.slice(1).reduce((sum, part) => sum * 256 + Number(part), 0);
    return IPV4_INTERNAL.some(([a, b, bits]) => {
      const base = (a * 256 + b) * 65536;
      const size = 2 ** (32 - bits);
      return value >= base && value < base + size;
    });
  }
  return ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
};

export const connectionVerdict = ({ ip, forwardedFor, hops }) => {
  const added = String(forwardedFor || "").split(",").map((part) => part.trim()).filter(Boolean);
  if (added.length < hops) return { verdict: "too-high", suggestedHops: added.length };
  if (isInternalAddress(ip)) return { verdict: "too-low", suggestedHops: hops + 1 };
  return { verdict: "ok", suggestedHops: hops };
};

router.get("/connection", (req, res) => {
  const forwardedFor = String(req.header("x-forwarded-for") || "");
  const hops = req.app.get("trust proxy");
  return res.status(200).json({
    data: {
      ip: req.ip,
      forwardedFor,
      trustProxyHops: hops,
      ...connectionVerdict({ ip: req.ip, forwardedFor, hops: Number(hops) || 0 }),
    },
    error: "",
  });
});

// LIST ADMINS AND THE LAST 10 CHANGES

router.get("/", async (req, res) => {
  try {
    return await respond(res);
  } catch (error) {
    return internalError(res, error);
  }
});

// GRANT ADMIN ACCESS to an existing account

router.post("/grant", async (req, res) => {
  try {
    const email = normalise(req.body?.email);
    if (!email) {
      return res.status(400).json({ data: "", error: "Enter the person's email" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        data: "",
        error: "No account uses that email. Ask them to sign up on the site first.",
      });
    }
    if (user.isAdmin || user.isOwner) {
      return res.status(400).json({ data: "", error: `${email} is already an admin` });
    }
    user.isAdmin = true;
    await user.save();
    await AdminAccessLog.create({ action: "grant", email, by: req.owner.email });
    await logActivity(req, "admin.grant", `Gave admin access to ${email}`);
    return await respond(res);
  } catch (error) {
    return internalError(res, error);
  }
});

// REMOVE ADMIN ACCESS. The owner can't remove their own access, or another
// owner's (owners are set in the database only), so the shop always keeps at
// least one admin: the owner doing the removing.

router.post("/revoke", async (req, res) => {
  try {
    const email = normalise(req.body?.email);
    if (email === req.owner.email) {
      return res.status(400).json({ data: "", error: "You can't remove your own admin access" });
    }
    const user = email && (await User.findOne({ email }));
    if (!user || !(user.isAdmin || user.isOwner)) {
      return res.status(404).json({ data: "", error: "That person isn't an admin" });
    }
    if (user.isOwner) {
      return res.status(400).json({
        data: "",
        error: "An owner's access can only be changed in the database",
      });
    }
    user.isAdmin = false;
    await user.save();
    await AdminAccessLog.create({ action: "revoke", email, by: req.owner.email });
    await logActivity(req, "admin.revoke", `Removed admin access from ${email}`);
    return await respond(res);
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
