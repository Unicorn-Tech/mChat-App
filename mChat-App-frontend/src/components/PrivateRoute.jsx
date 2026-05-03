import { Navigate, useLocation } from "react-router";

import { TOKEN_KEY } from "../services/apiClient";

export default function PrivateRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return <Navigate to="/messenger/login" replace state={{ from: location }} />;
  }

  return children;
}
