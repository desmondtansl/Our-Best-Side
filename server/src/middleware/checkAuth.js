import { verifyToken, tokenFrom } from "../tokens.js";

// Requires a valid, current login token. Sets req.user to its email.
const checkAuth = async (req, res, next) => {
  try {
    const email = await verifyToken(tokenFrom(req));
    if (!email) {
      return res.status(403).json({
        data: "",
        errors: [
          {
            message: "Unauthorized",
          },
        ],
      });
    }
    req.user = email;
    return next();
  } catch (error) {
    return next(error);
  }
};

export default checkAuth;
