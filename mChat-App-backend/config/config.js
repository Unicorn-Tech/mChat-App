/**
 * Centralized config.
 * Uses environment variables (preferred for production).
 */

const PORT = Number(process.env.PORT ?? 3000);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const DB_URI = process.env.DB_URI ?? "mongodb://localhost:27017/mchat-app";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? "1h";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "change-me";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? "7d";

const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET ?? "change-me";
const JWT_RESET_EXPIRY = process.env.JWT_RESET_EXPIRY ?? "1h";

const JWT_VERIFY_SECRET = process.env.JWT_VERIFY_SECRET ?? "change-me";
const JWT_VERIFY_EXPIRY = process.env.JWT_VERIFY_EXPIRY ?? "1h";

module.exports = {
  PORT,
  NODE_ENV,
  DB_URI,
  JWT_SECRET,
  JWT_EXPIRY,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRY,
  JWT_RESET_SECRET,
  JWT_RESET_EXPIRY,
  JWT_VERIFY_SECRET,
  JWT_VERIFY_EXPIRY,
};