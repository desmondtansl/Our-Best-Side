import { UserAuth } from "../context/Auth";
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

// Pages for any logged-in user (ProtectedRoutes is admin-only).
const UserRoutes = () => {
  const [user] = UserAuth();

  if (user.loading) {
    return <HourglassBottomIcon />;
  }

  return user.data ? <Outlet /> : <Navigate to="/login" />;
};

export default UserRoutes;
