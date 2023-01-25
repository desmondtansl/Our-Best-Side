import JWT from "jsonwebtoken";

const checkAuth = async (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    return res.status(403).json({
      data: "",
      errors: [
        {
          message: "Unauthorized",
        },
      ],
    });
  }

  token = token.split(" ")[1];

  try {
    const user = await JWT.verify(token, process.env.JWT_SECRET);
    console.log(user);
    // if (!user.isAdmin) {
    //   return res.status(403).json({
    //     data: "",
    //     errors: [
    //       {
    //         message: "Unauthorized",
    //       },
    //     ],
    //   });
    // }
    req.user = user.email;
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

export default checkAuth;
