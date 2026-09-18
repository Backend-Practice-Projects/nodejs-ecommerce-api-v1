const { check, body } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const slugify = require("slugify");

exports.createSubCategoryValidator = [
  check("name")
    .notEmpty()
    .withMessage("SubCategory Name is required")
    .isLength({ min: 2 })
    .withMessage("SubCategory Name length must not be less than two character")
    .isLength({ max: 32 })
    .withMessage(
      "SubCategory Name length must not be greater than thirty two character",
    )
    .custom((name, { req }) => {
      req.body.slug = slugify(name);
      return true;
    }),
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
  body("name")
    /**
     * Marks the field(s) of the validation chain as optional. By default, only fields with an undefined value are
     * considered optional and will be ignored when validating.
     */
    .optional()
    .custom((name, { req }) => {
      req.body.slug = slugify(name);
      return true;
    }),
  requestValidatorMiddleware,
];
exports.deleteSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
