const jwt = require("jsonwebtoken");

function signAccessToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = { signAccessToken, verifyToken };

