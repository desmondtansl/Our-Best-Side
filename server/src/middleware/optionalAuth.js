import JWT from "jsonwebtoken";

// Like checkAuth, but lets requests without a valid token through as guests.
// Sets req.user to the token's email when the token is valid.
const optionalAuth = (req, res, next) => {
  const header = req.header("Authorization");
  if (header) {
    try {
      const user = JWT.verify(header.split(" ")[1], process.env.JWT_SECRET);
      req.user = user.email;
    } catch (error) {
      // Expired or invalid tokens fall back to guest checkout.
    }
  }
  next();
};

export default optionalAuth;
