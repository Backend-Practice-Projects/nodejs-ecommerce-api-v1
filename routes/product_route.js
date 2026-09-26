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

router
  .route("/")
  .post(
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
    uploadProductImages,
    resizeImageMiddleware,
    updateProductValidator,
    updateProductService,
  )
  .delete(deleteProductValidator, deleteProductService);
module.exports = router;
