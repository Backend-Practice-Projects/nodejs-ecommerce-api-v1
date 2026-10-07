const express = require("express");
const router = express.Router();
const reviewRoute = require("./review_route");
const {
  getProductValidator,
  updateProductValidator,
  deleteProductValidator,
  createProductValidator,
} = require("../utils/validators/product_validator");

const {
  getProductsService,
  getProductService,
  createProductService,
  updateProductService,
  deleteProductService,
  uploadProductImages,
  resizeImageMiddleware,
} = require("../services/product_service");

const { protect, allowedTo } = require("../services/auth_service");

/*
 Nested Route: /products/:productId/reviews
 Any request whose path starts with /:productId/reviews is handed off to
 reviewRoute, with the matched prefix stripped (so "/" and "/:id" there map to
 /products/:productId/reviews and /products/:productId/reviews/:id).
 reviewRoute is created with { mergeParams: true }, which lets it read
 req.params.productId from this parent route. The review middlewares use it to
 filter reviews by product (GET) and to set the product on a new review (POST).
*/
router.use("/:productId/reviews", reviewRoute);

router
  .route("/")
  .post(
    protect,
    allowedTo("admin", "manager"),
    uploadProductImages,
    resizeImageMiddleware,
    createProductValidator,
    createProductService,
  )
  .get(getProductsService);

router
  .route("/:id")
  .get(getProductValidator, getProductService)
  .put(
    protect,
    allowedTo("admin", "manager"),
    uploadProductImages,
    resizeImageMiddleware,
    updateProductValidator,
    updateProductService,
  )
  .delete(
    protect,
    allowedTo("admin"),
    deleteProductValidator,
    deleteProductService,
  );
module.exports = router;
