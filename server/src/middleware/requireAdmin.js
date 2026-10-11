import User, { isAdmin, hasTwoFactor } from "../models/User.js";

const refuse = (res, message, code) =>
  res.status(403).json({ data: "", error: message, errors: [{ message }], ...(code && { code }) });

export const TWO_FACTOR_REQUIRED =
  "Turn on two-step login (My Account → Security) to use the admin pages.";

// Must run after checkAuth, which sets req.user to the token's email.
// Admin status is read from the database rather than the token, since
// signup tokens do not carry isAdmin and admin rights can be revoked.
// Admins must have two-step login turned on: an admin password alone isn't
// enough to refund orders or change the shop.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!isAdmin(user)) return refuse(res, "Unauthorized");
    if (!hasTwoFactor(user)) return refuse(res, TWO_FACTOR_REQUIRED, "TWO_FACTOR_REQUIRED");
    next();
  } catch (error) {
    return refuse(res, "Unauthorized");
  }
};

export default requireAdmin;
