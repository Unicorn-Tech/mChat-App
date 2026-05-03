const createError = require("http-errors");
const { verifyToken } = require("../utils/jwt");
const { JWT_SECRET } = require("../../config/config");
const { User } = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    const token = bearer || req.cookies?.accessToken || null;
    if (!token) return next(createError(401, "Missing access token"));

    const decoded = verifyToken(token, JWT_SECRET);
    const userId = decoded?.sub;
    if (!userId) return next(createError(401, "Invalid token"));

    const user = await User.findById(userId);
    if (!user) return next(createError(401, "User not found"));

    req.user = user;
    return next();
  } catch (err) {
    return next(createError(401, "Unauthorized"));
  }
}

module.exports = { requireAuth };

