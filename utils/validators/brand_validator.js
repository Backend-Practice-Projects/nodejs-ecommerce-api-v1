const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");

exports.createBrandValidator = [
  check("name")
    .notEmpty()
    .withMessage("Brand Name is required")
    .isLength({ min: 3 })
    .withMessage("Brand Name length must not be less than three character")
    .isLength({ max: 30 })
    .withMessage("Brand Name length must not be greater than thirty character"),
  requestValidatorMiddleware,
];
exports.getBrandValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.updateBrandValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.deleteBrandValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
