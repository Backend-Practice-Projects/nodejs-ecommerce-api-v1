//const { param, validationResult } = require("express-validator");
const { validationResult } = require("express-validator");

/**
 * express-validator is a set of express.js middlewares that wraps the extensive collection of validators and sanitizers offered
 * by validator.js. It allows you to combine them in many ways so that you can validate and sanitize your express requests, and
 * offers tools to determine if the request is valid or not, which data was matched according to your validators, and so on.
 */

/* const requestValidatorMiddleware = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(400).send({ errors: result.array() });
  }
  //To continue to the service layer middleware
  next();
}; */

const requestValidatorMiddleware = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(400).send({ errors: result.array() });
  }
  //To continue to the service layer middleware
  next();
};

module.exports = requestValidatorMiddleware;
