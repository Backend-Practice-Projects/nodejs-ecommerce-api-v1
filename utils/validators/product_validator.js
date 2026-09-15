const { check } = require("express-validator");
const CategoriesDoc = require("../../models/category_model");
const SubCategoryDoc = require("../../models/sub_category_model");
/**
 * we define it as {validatorMiddleware} and in request_validator_middleware we exported as module.exports = requestValidatorMiddleware;
 * without {}. We will have TypeError('argument handler must be a function')
 */
const validatorMiddleware = require("../../middlewares/request_validator_middleware");

exports.createProductValidator = [
  check("title")
    .isLength({ min: 3 })
    .withMessage("Must be at least 3 chars")
    .notEmpty()
    .withMessage("Product title is required"),
  check("description")
    .notEmpty()
    .withMessage("Product description is required")
    .isLength({ max: 2000 })
    .withMessage("Too long description"),
  check("quantity")
    .notEmpty()
    .withMessage("Product quantity is required")
    .isNumeric()
    .withMessage("Product quantity must be a number"),
  check("sold")
    .optional()
    .isNumeric()
    .withMessage("Product sold must be a number"),
  check("price")
    .notEmpty()
    .withMessage("Product price is required")
    .isFloat({ min: 0, max: 200000 })
    .withMessage("Product price must be a number between 0 and 200000"),
  check("priceAfterDiscount")
    .optional()
    .isNumeric()
    .withMessage("Product priceAfterDiscount must be a number")
    .toFloat()
    .custom((value, { req }) => {
      if (req.body.price <= value) {
        throw new Error("priceAfterDiscount must be lower than price");
      }
      return true;
    }),
  check("colors")
    .optional()
    .isArray()
    .withMessage("availableColors should be array of string"),
  check("imageCover").notEmpty().withMessage("Product imageCover is required"),
  check("images")
    .optional()
    .isArray()
    .withMessage("Images should be array of string"),
  check("category")
    .notEmpty()
    .withMessage("Product must belongs to a category")
    .isMongoId()
    .withMessage("Invalid ID formate")
    .custom((categoryId) =>
      CategoriesDoc.findById(categoryId).then((category) => {
        if (!category) {
          return Promise.reject(
            new Error(`No category found for this id ${categoryId}`),
          );
        }
      }),
    ),
  check("subcategories")
    .optional()
    .isMongoId()
    .withMessage("Invalid ID formate")
    .custom((subcategoriesIds) =>
      /**
       * This syntax is MongoDB-specific. The operators like $in and $exists don't exist in plain JavaScript.
       * This MongoDB query finds documents in the SubCategoryDoc collection where the _id exists and matches any ID in
       * the subcategoriesIds array.
       * The $exists: true check is redundant (—_id) always exists on MongoDB documents, and $in already handles that.
       */
      SubCategoryDoc.find({
        _id: { $in: subcategoriesIds },
        //_id: { $exists: true, $in: subcategoriesIds },
      }).then((result) => {
        if (result.length < 1 || subcategoriesIds.length !== result.length) {
          return Promise.reject(new Error(`InValid subcategories Ids `));
        }
      }),
    )
    .custom((subcategoriesIds, { req }) =>
      /**
       * { req } is object destructuring — it pulls the req property out of that second argument. It's shorthand for:
       * .custom((subcategoriesIds, meta) => {
       * const req = meta.req;
       * ...
       * })
       * If you wanted the local variable to have a different name than the property, you'd write it like an object literal in reverse:
       * (value, { req: myRequest }) => {
       * myRequest now holds meta.req
       * }
       */
      SubCategoryDoc.find({ category: req.body.category }).then(
        (subcategories) => {
          const subcategoriesIDsInDB = [];
          subcategories.forEach((subcategory) => {
            subcategoriesIDsInDB.push(subcategory._id.toString());
          });
          const checker = (target, array) =>
            target.every((categoryId) => array.includes(categoryId));
          if (!checker(subcategoriesIds, subcategoriesIDsInDB)) {
            return Promise.reject(
              new Error(
                `No subcategories belong to that category ${req.body.category} `,
              ),
            );
          }
        },
      ),
    ),

  check("brand").optional().isMongoId().withMessage("Invalid ID formate"),
  check("ratingsAverage")
    .optional()
    .isNumeric()
    .withMessage("ratingsAverage must be a number")
    .isLength({ min: 1 })
    .withMessage("Rating must be above or equal 1.0")
    .isLength({ max: 5 })
    .withMessage("Rating must be below or equal 5.0"),
  check("ratingsQuantity")
    .optional()
    .isNumeric()
    .withMessage("ratingsQuantity must be a number"),

  validatorMiddleware,
];

exports.getProductValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];

exports.updateProductValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];

exports.deleteProductValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];
