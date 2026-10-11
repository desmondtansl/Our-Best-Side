import { UserAuth } from "../context/Auth";
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

const ProtectedRoute = () => {
  const [user] = UserAuth();

  if (user.loading) {
    return <HourglassBottomIcon />;
  }

  if (!user.data?.isAdmin) return <Navigate to="/" />;
  // Admin pages need two-step login: admins without it are sent to set it up.
  if (!user.data.twoFactorEnabled) return <Navigate to="/account?tab=security" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
