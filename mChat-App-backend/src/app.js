require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const mongoose = require("mongoose");

const { NODE_ENV } = require("../config/config");
const { authRouter } = require("./routes/auth");
const { usersRouter } = require("./routes/users");
const { chatsRouter } = require("./routes/chats");
const { messagesRouter } = require("./routes/messages");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (req, res) => res.status(200).json({ ok: true }));
  app.get("/health/db", (req, res) => {
    // mongoose.readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const state = mongoose.connection.readyState;
    const stateLabel = ["disconnected", "connected", "connecting", "disconnecting"][state] ?? "unknown";
    const ok = state === 1;
    return res.status(ok ? 200 : 503).json({ ok, db: stateLabel });
  });

  app.get("/", (req, res) => {
    res.json({ ok: true, name: "mChat backend" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/chats", chatsRouter);
  app.use("/api/messages", messagesRouter);

  // 404
  app.use((req, res, next) => next(createError(404, "Not Found")));

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = Number(err.status ?? 500);
    const payload = {
      error: err.message ?? "Internal Server Error",
    };

    if (err.errors) payload.details = err.errors;
    if (NODE_ENV !== "production" && err.stack) payload.stack = err.stack;

    res.status(status).json(payload);
  });

  return app;
}

module.exports = { createApp };

