const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { register, login, me, refresh, logout } = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").isString().trim().isLength({ min: 2, max: 60 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("avatarUrl").optional().isString()
  ],
  validate,
  register,
);

router.post("/login", [body("email").isEmail(), body("password").isLength({ min: 6 })], validate, login);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = { authRouter: router };

