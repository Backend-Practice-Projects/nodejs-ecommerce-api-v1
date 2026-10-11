const { check, body } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const CouponDoc = require("../../models/coupon_model");

/* `unique` is an index not a validator, so we check it here to return a readable message.
   The name is stored trimmed and uppercased, so we compare against the same shape. */
const checkNameIsUnique = async (name, { req }) => {
  const coupon = await CouponDoc.findOne({ name: name.trim().toUpperCase() });
  //On update the coupon is allowed to keep its own name
  if (coupon && coupon._id.toString() !== req.params.id) {
    throw new Error("Coupon name already exists");
  }
  return true;
};

const checkExpireIsInFuture = (expire) => {
  if (new Date(expire) <= new Date()) {
    throw new Error("Coupon expire date must be in the future");
  }
  return true;
};

exports.createCouponValidator = [
  check("name")
    .notEmpty()
    .withMessage("Coupon name is required")
    .bail()
    .isString()
    .withMessage("Coupon name must be text")
    .bail()
    .custom(checkNameIsUnique),
  /**
   * expire only accepts ISO 8601 dates, so send "2026-11-10" (or "2026-11-10T23:59:59Z"
   * for a specific time) instead of "11/10/2026", which fails with
   * "Coupon expire date must be a valid date".
   *
   * We keep it strict because "11/10/2026" is ambiguous: JavaScript reads it as
   * 10 November, while day-first readers mean 11 October.
   *
   * To accept MM/DD/YYYY instead, replace isISO8601() with
   * isDate({ format: "MM/DD/YYYY" }).
   */
  check("expire")
    .notEmpty()
    .withMessage("Coupon expire date is required")
    .bail()
    .isISO8601()
    .withMessage("Coupon expire date must be a valid date")
    .bail()
    .custom(checkExpireIsInFuture),
  check("discount")
    .notEmpty()
    .withMessage("Coupon discount value is required")
    .isFloat({ min: 1, max: 100 })
    .withMessage("Coupon discount must be between 1 and 100"),
  requestValidatorMiddleware,
];

exports.getCouponValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];

exports.updateCouponValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  body("name")
    .optional()
    .isString()
    .withMessage("Coupon name must be text")
    .bail()
    .custom(checkNameIsUnique),
  body("expire")
    .optional()
    .isISO8601()
    .withMessage("Coupon expire date must be a valid date")
    .bail()
    .custom(checkExpireIsInFuture),
  body("discount")
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage("Coupon discount must be between 1 and 100"),
  requestValidatorMiddleware,
];

exports.deleteCouponValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
