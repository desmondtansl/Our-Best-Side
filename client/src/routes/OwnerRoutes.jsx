import { UserAuth } from "../context/Auth";
import React from "react";
import { Outlet, Navigate } from "react-router-dom";

// Owner-only pages, nested inside ProtectedRoutes (which handles loading and
// non-admins). Other admins are sent back to the dashboard.
const OwnerRoutes = () => {
  const [user] = UserAuth();

  return user.data?.isOwner ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default OwnerRoutes;
