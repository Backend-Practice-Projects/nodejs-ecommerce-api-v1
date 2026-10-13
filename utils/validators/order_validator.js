const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");

/* "shippingAddress.details" is a dotted path: express-validator reads it as
   req.body.shippingAddress.details by splitting the string on the dots. */
exports.createCashOrderValidator = [
  check("shippingAddress.details")
    .trim()
    .notEmpty()
    .withMessage("Shipping address details required"),
  check("shippingAddress.phone")
    .notEmpty()
    .withMessage("Shipping address phone required")
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number, only EG and SA numbers are accepted"),
  check("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("Shipping address city required"),
  check("shippingAddress.postalCode").optional().isString().trim(),
  requestValidatorMiddleware,
];

exports.getOrderValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
