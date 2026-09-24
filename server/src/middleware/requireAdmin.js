import User from "../models/User.js";

// Must run after checkAuth, which sets req.user to the token's email.
// Admin status is read from the database rather than the token, since
// signup tokens do not carry isAdmin and admin rights can be revoked.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        data: "",
        errors: [
          {
            message: "Unauthorized",
          },
        ],
      });
    }
    next();
  } catch (error) {
    return res.status(403).json({
      data: "",
      errors: [
        {
          message: "Unauthorized",
        },
      ],
    });
  }
};

export default requireAdmin;
