const express = require("express");
const router = express.Router();
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
