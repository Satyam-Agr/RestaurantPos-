import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedStaffRoute({ role, children }) {
  const token = localStorage.getItem("staff_token");
  const staff = JSON.parse(localStorage.getItem("staff_info") || "null");
  if (!token || !staff) return <Navigate to="/staff/login" replace />;
  if (role && staff.role !== role) return <Navigate to="/staff/login" replace />;
  return children;
}
