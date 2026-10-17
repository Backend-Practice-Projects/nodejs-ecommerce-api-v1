const ApiError = require("../utils/api_error");

/*
 * Global error handler, the last middleware in the chain. Every error passed to
 * next(error) (or thrown inside express-async-handler) ends up here.
 *
 * The express-validator rules in utils/validators/ reject most bad input before it
 * reaches Mongoose, but they can't catch everything, so two Mongo errors are
 * translated into a readable 400 instead of leaking out as a generic 500:
 *
 *   1. Duplicate key (error.code 11000): `unique` is an index, not a validator, so
 *      it has no message of its own. It is thrown when:
 *        - two simultaneous requests both pass the validator's "does it exist"
 *          check and then both insert (race condition)
 *        - a unique index has no validator in front of it: one cart per user,
 *          one review per {user, product}, one order per Stripe session
 *
 *   2. ValidationError: thrown by schema validators such as required, minlength
 *      and maxlength, when a route reaches the model without a request validator.
 *
 * Both are converted to a 400 ApiError, then every error (converted or not) is sent
 * by the development / production formatters, so the response shape stays consistent.
 */
const globalErrorMiddleware = (error, req, res, next) => {
  if (error.code === 11000) {
    error = handleDuplicateKeyError(error);
  } else if (error.name === "ValidationError") {
    error = handleSchemaValidationError(error);
  }

  if (process.env.NODE_ENV === "development") {
    return sendDevelopmentError(res, error);
  }
  return sendProductionError(res, error);
};

/*
 * Both handlers below turn a Mongo error into a 400 ApiError, so it goes through the
 * same development / production formatters as every other error.
 */
const handleDuplicateKeyError = (error) => {
  /*
   * Example: registering two users with the same email makes Mongo throw
   *   { code: 11000, keyValue: { email: "ali@test.com" } }
   * Object.keys(error.keyValue) turns that object into an array of its field names,
   * ["email"], and [0] takes the first one. For a compound index like
   * { user, product } there are several keys, we only report the first.
   * Final message: "email must be unique, this value already exists"
   */
  const field = Object.keys(error.keyValue || {})[0];
  return new ApiError(`${field} must be unique, this value already exists`, 400);
};

const handleSchemaValidationError = (error) => {
  /*
   * Example: creating a product with no title and a too short description makes
   * Mongoose throw
   *   { name: "ValidationError", errors: {
   *       title:       { message: "Product title is required" },
   *       description: { message: "Description is too short" } } }
   * error.errors is keyed by field name, and we only need the messages, not the keys:
   *   Object.values(error.errors)  -> [{ message: "Product title is required" }, { message: "Description is too short" }]
   *   .map((one) => one.message)   -> ["Product title is required", "Description is too short"]
   *   .join(", ")                  -> "Product title is required, Description is too short"
   * (the texts come from the messages declared in each model schema)
   */
  const messages = Object.values(error.errors).map((one) => one.message);
  return new ApiError(messages.join(", "), 400);
};

const sendProductionError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const status = error.status || "Error";
  return res.status(statusCode).json({
    message: error.message,
    status: status,
  });
};
const sendDevelopmentError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const status = error.status || "Error";
  return res.status(statusCode).json({
    error: error,
    message: error.message,
    stack: error.stack,
    status: status,
  });
};
module.exports = globalErrorMiddleware;
