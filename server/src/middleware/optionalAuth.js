import { verifyToken, tokenFrom } from "../tokens.js";

// Like checkAuth, but lets requests without a valid token through as guests.
// Sets req.user to the token's email when the token is valid and current.
const optionalAuth = async (req, res, next) => {
  try {
    const email = await verifyToken(tokenFrom(req));
    if (email) req.user = email;
    return next();
  } catch (error) {
    return next(error);
  }
};

export default optionalAuth;
