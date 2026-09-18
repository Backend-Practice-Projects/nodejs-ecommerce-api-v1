const { check, body } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const slugify = require("slugify");

exports.createCategoryValidator = [
  //We can use check as a general validator rather than param,body and query
  check("name")
    .notEmpty()
    .withMessage("Category Name is required")
    .isLength({ min: 3 })
    .withMessage("Category Name length must not be less than three character")
    .isLength({ max: 30 })
    .withMessage(
      "Category Name length must not be greater than thirty character",
    )
    .custom((name, { req }) => {
      req.body.slug = slugify(name);
      return true;
    }),
  requestValidatorMiddleware,
];
exports.getCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.updateCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  //You can use check rather than body
  body("name").custom((name, { req }) => {
    req.body.slug = slugify(name);
    return true;
  }),
  requestValidatorMiddleware,
];
exports.deleteCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];

exports.getCategorySubCategoriesValidator = [
  check("categoryId").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
