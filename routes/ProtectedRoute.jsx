import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ROLE_HOME = {
  admin:        "/dashboard",
  doctor:       "/doctor/dashboard",
  receptionist: "/receptionist/dashboard",
  patient:      "/patient/dashboard",
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useSelector((state) => state.auth);
  const role = String(user?.role || "").toLowerCase().trim();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
    return <Navigate to={ROLE_HOME[role] || "/login"} replace />;
  }

  return children;
}