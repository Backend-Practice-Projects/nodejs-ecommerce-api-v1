const { check, body } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const ReviewDoc = require("../../models/review_model");
const ProductDoc = require("../../models/product_model");

/* Runs after assignProductAndUserMiddleware, so body.user and body.product are already set.
   No validator for user: the client never sends it, assignProductAndUserMiddleware overwrites it
   with the logged-in user's id (req.user._id) from the token, so it is always valid and can't be
   spoofed by sending another user's id in the body. */
exports.createReviewValidator = [
  check("title").optional().isString().withMessage("Review title must be text"),
  check("ratings")
    .notEmpty()
    .withMessage("Review ratings required")
    .isFloat({ min: 1, max: 5 })
    .withMessage("Ratings value must be between 1 and 5"),
  check("product")
    .isMongoId()
    .withMessage("Invalid Mongo ID Format")
    //Stop here if the id isn't 24 hex chars, otherwise findById throws a CastError reported as a second error
    .bail()
    .custom(async (productId, { req }) => {
      const product = await ProductDoc.findById(productId);
      if (!product) {
        throw new Error(`No product found for this id ${productId}`);
      }
      const review = await ReviewDoc.findOne({
        user: req.user._id,
        product: productId,
      });
      if (review) {
        //You can use Promise.reject or async/await
        throw new Error("You already created a review for this product");
      }
      //Act as next in middlewares
      return true;
    }),
  requestValidatorMiddleware,
];

exports.getReviewValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];

exports.updateReviewValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  body("title").optional().isString().withMessage("Review title must be text"),
  body("ratings")
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage("Ratings value must be between 1 and 5"),
  requestValidatorMiddleware,
];

exports.deleteReviewValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];

//Nested route param: GET /products/:productId/reviews
exports.getReviewsValidator = [
  check("productId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
