const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const ProductDoc = require("../../models/product_model");

exports.addProductToWishlistValidator = [
  check("productId")
    .notEmpty()
    .withMessage("Product id required")
    .isMongoId()
    .withMessage("Invalid Mongo ID Format")
    .bail()
    .custom(async (productId) => {
      const product = await ProductDoc.findById(productId);
      if (!product) {
        throw new Error(`No product found for this id ${productId}`);
      }
      return true;
    }),
  requestValidatorMiddleware,
];

exports.removeProductFromWishlistValidator = [
  check("productId").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
