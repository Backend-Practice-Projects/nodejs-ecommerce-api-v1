const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");

exports.createSubCategoryValidator = [
  check("name")
    .notEmpty()
    .withMessage("SubCategory Name is required")
    .isLength({ min: 2 })
    .withMessage("SubCategory Name length must not be less than two character")
    .isLength({ max: 32 })
    .withMessage(
      "SubCategory Name length must not be greater than thirty two character",
    ),
  check("category")
    .notEmpty()
    .withMessage("SubCategory must belong to a category")
    .isMongoId()
    .withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.getSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.updateSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.deleteSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
