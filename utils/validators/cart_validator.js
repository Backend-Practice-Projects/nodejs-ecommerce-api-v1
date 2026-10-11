const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");

/* No product existence check here: the service has to load the product anyway
   to read its price and stock, so it returns the 404 itself and saves a query. */
exports.addProductToCartValidator = [
  check("productId")
    .notEmpty()
    .withMessage("Product id required")
    .isMongoId()
    .withMessage("Invalid Mongo ID Format"),
  check("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a whole number not less than 1")
    //Convert "2" to 2, otherwise quantity += "2" would concatenate
    .toInt(),
  check("color")
    .optional()
    .isString()
    .withMessage("Color must be text")
    //The service matches items by exact color, so " red" must not differ from "red"
    .trim(),
  requestValidatorMiddleware,
];

exports.updateCartItemQuantityValidator = [
  check("itemId").isMongoId().withMessage("Invalid Mongo ID Format"),
  check("quantity")
    .notEmpty()
    .withMessage("Quantity required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a whole number not less than 1")
    .toInt(),
  requestValidatorMiddleware,
];

exports.removeCartItemValidator = [
  check("itemId").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];

exports.applyCouponValidator = [
  check("coupon")
    .notEmpty()
    .withMessage("Coupon name required")
    .isString()
    .withMessage("Coupon name must be text"),
  requestValidatorMiddleware,
];
