const createError = require("http-errors");
const { matchedData } = require("express-validator");
const { asyncHandler } = require("../utils/asyncHandler");
const { User } = require("../models/User");
const { signAccessToken, verifyToken } = require("../utils/jwt");
const {
  JWT_SECRET,
  JWT_EXPIRY,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRY,
  NODE_ENV,
} = require("../../config/config");

function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProd = NODE_ENV === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
/** 
@register
Register a new user with name, email, password, and optional avatarUrl. 
Returns user info and tokens.
**/
const register = asyncHandler(async (req, res) => {
  const data = matchedData(req);
  const { name, password, avatarUrl } = data;
  const email = data.email.toString().trim().toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) throw createError(409, "Email already in use");

  const user = new User({ name, email, passwordHash: "temp" });
  await user.setPassword(password);

  // If avatarUrl is provided, store it
  if (avatarUrl) {
    user.avatarUrl = avatarUrl;
  }

  await user.save();

  const accessToken = signAccessToken(
    { sub: user._id.toString() },
    JWT_SECRET,
    JWT_EXPIRY,
  );
  const refreshToken = signAccessToken(
    { sub: user._id.toString(), type: "refresh" },
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRY,
  );

  setAuthCookies(res, { accessToken, refreshToken });
  res.status(201).json({ user: user.toSafeJSON(), accessToken, refreshToken });
});

/** 
@login
Login an existing user with email and password.
Returns user info and tokens.
**/
const login = asyncHandler(async (req, res) => {
  const { password } = matchedData(req);
  const email = matchedData(req).email.toString().trim().toLowerCase();

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) throw createError(401, "Invalid credentials");

  const ok = await user.verifyPassword(password);
  if (!ok) throw createError(401, "Invalid credentials");

  const accessToken = signAccessToken(
    { sub: user._id.toString() },
    JWT_SECRET,
    JWT_EXPIRY,
  );
  const refreshToken = signAccessToken(
    { sub: user._id.toString(), type: "refresh" },
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRY,
  );

  setAuthCookies(res, { accessToken, refreshToken });
  res.json({ user: user.toSafeJSON(), accessToken, refreshToken });
});

/** 
@me
Get the authenticated user's info.
**/
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) throw createError(401, "Missing refresh token");

  const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
  if (decoded?.type !== "refresh")
    throw createError(401, "Invalid refresh token");

  const userId = decoded?.sub;
  const user = await User.findById(userId);
  if (!user) throw createError(401, "User not found");

  const accessToken = signAccessToken(
    { sub: user._id.toString() },
    JWT_SECRET,
    JWT_EXPIRY,
  );
  const newRefreshToken = signAccessToken(
    { sub: user._id.toString(), type: "refresh" },
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRY,
  );

  setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });
  res.json({ accessToken, refreshToken: newRefreshToken });
});

/** 
@logout
Clear authentication cookies to log the user out.
**/
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(204).send();
});

module.exports = { register, login, me, refresh, logout };
