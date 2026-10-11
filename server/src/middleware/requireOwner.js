import User, { hasTwoFactor } from "../models/User.js";
import { TWO_FACTOR_REQUIRED } from "./requireAdmin.js";

const refuse = (res, message, code) =>
  res.status(403).json({ data: "", error: message, errors: [{ message }], ...(code && { code }) });

// Must run after checkAuth. Like requireAdmin, reads the database rather
// than the token, and needs two-step login. Sets req.owner to the owner's
// user document.
const requireOwner = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user?.isOwner) return refuse(res, "Only the shop owner can do this");
    if (!hasTwoFactor(user)) return refuse(res, TWO_FACTOR_REQUIRED, "TWO_FACTOR_REQUIRED");
    req.owner = user;
    next();
  } catch (error) {
    return refuse(res, "Unauthorized");
  }
};

export default requireOwner;
