import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { FaArrowRight, FaEye, FaEyeSlash } from "react-icons/fa";

import { useAppDispatch } from "../hooks/useAppDispatch";
import { useAppSelector } from "../hooks/useAppSelector";
import { loginRequest, clearAuthError } from "../features/auth/slice/authSlice";
import "../css/Login.css";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useAppSelector((s) => s.auth);
  const loginAttempt = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (!token) return;
    if (loginAttempt.current) {
      toast.success("Signed in");
      loginAttempt.current = false;
    }
    navigate("/messenger", { replace: true });
  }, [token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Invalid email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    loginAttempt.current = true;
    dispatch(loginRequest({ email, password }));
  };

  return (
    <div className="auth-page login-page">
      <div className="container">
        <div className="card">
          <div className="icon"><FaArrowRight /></div>
          <h2>Sign in with email</h2>
          <p className="subtitle">Enter your credentials to continue to mChat.</p>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="input-group password">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="eye"
                aria-label={showPwd ? "Hide password" : "Show password"}
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="forgot">Forgot password?</div>
            <input
              type="submit"
              className="btn"
              value={loading ? "Signing in…" : "Get Started"}
              disabled={loading}
            />
          </form>
          <p className="auth-switch">
            Need an account? <Link to="/messenger/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
