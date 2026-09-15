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
} = require("../services/product_service");

router
  .route("/")
  .post(createProductValidator, createProductService)
  .get(getProductsService);

router
  .route("/:id")
  .get(getProductValidator, getProductService)
  .put(updateProductValidator, updateProductService)
  .delete(deleteProductValidator, deleteProductService);
module.exports = router;
