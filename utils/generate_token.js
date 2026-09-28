const jwt = require("jsonwebtoken");

const generateToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRY_DATE,
  });

module.exports = generateToken;
