import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";

import { useAppDispatch } from "../hooks/useAppDispatch";
import { useAppSelector } from "../hooks/useAppSelector";
import { registerRequest, clearAuthError } from "../features/auth/slice/authSlice";
import "../css/Register.css";

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useAppSelector((s) => s.auth);
  const registerAttempt = useRef(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (!token) return;
    if (registerAttempt.current) {
      toast.success("Account created");
      registerAttempt.current = false;
    }
    navigate("/messenger", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setAvatarFile(file);
  };

  const resizeImage = (file, maxWidth = 512, maxHeight = 512) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          const width = Math.round(img.width * ratio);
          const height = Math.round(img.height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().length < 2) {
      toast.error("Username must be at least 2 characters");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Invalid email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    registerAttempt.current = true;

    const payload = {
      name: username,
      email,
      password,
    };

    if (avatarFile) {
      try {
        const resized = await resizeImage(avatarFile, 512, 512);
        payload.avatarUrl = resized;
      } catch {
        toast.error("Failed to process avatar image. Please try a smaller file.");
        return;
      }
    }

    dispatch(registerRequest(payload));
  };

  return (
    <div className="auth-page register-page">
      <div className="container">
        <form className="form" onSubmit={handleSubmit}>
          <h2>Create account</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div className="image-upload">
            <div className="image-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" />
              ) : (
                <span>{(username || email || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <label className="upload-btn">
              Upload photo
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </button>
          <p>
            Already have an account? <Link to="/messenger/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
