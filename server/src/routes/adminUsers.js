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
// What the server sees as the owner's internet address, so they can check
// it matches their real one (e.g. on whatismyipaddress.com). If it doesn't,
// every visitor may look like the same address to the rate limits; the
// TRUST_PROXY_HOPS setting on Render fixes that.

router.get("/connection", (req, res) =>
  res.status(200).json({
    data: {
      ip: req.ip,
      forwardedFor: String(req.header("x-forwarded-for") || ""),
      trustProxyHops: req.app.get("trust proxy"),
    },
    error: "",
  })
);

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
