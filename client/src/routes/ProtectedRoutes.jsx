import { UserAuth } from "../context/Auth";
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

const ProtectedRoute = () => {
  const [user] = UserAuth();

  if (user.loading) {
    return <HourglassBottomIcon />;
  }

  return user.data ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;
