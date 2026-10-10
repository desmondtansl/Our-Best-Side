import User from "../models/User.js";

// Must run after checkAuth. Like requireAdmin, reads the database rather
// than the token. Sets req.owner to the owner's user document.
const requireOwner = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user?.isOwner) {
      return res.status(403).json({
        data: "",
        errors: [
          {
            message: "Only the shop owner can do this",
          },
        ],
      });
    }
    req.owner = user;
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

export default requireOwner;
