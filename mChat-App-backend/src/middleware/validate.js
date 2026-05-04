const { validationResult } = require("express-validator");
const createError = require("http-errors");

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(createError(422, "Validation error", { errors: result.array() }));
}

module.exports = { validate };
