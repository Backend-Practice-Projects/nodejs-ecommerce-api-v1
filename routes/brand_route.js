const express = require("express");
const router = express.Router();
const {
  getBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
  createBrandValidator,
} = require("../utils/validators/brand_validator");

const {
  getBrandsService,
  getBrandService,
  createBrandService,
  updateBrandService,
  deleteBrandService,
  uploadBrandImageMiddleware,
  resizeImageMiddleware,
} = require("../services/brand_service");

const { protect, allowedTo } = require("../services/auth_service");

router
  .route("/")
  .post(
    protect,
    allowedTo("admin", "manager"),
    uploadBrandImageMiddleware,
    resizeImageMiddleware,
    createBrandValidator,
    createBrandService,
  )
  .get(getBrandsService);

router
  .route("/:id")
  .get(getBrandValidator, getBrandService)
  .put(
    protect,
    allowedTo("admin", "manager"),
    uploadBrandImageMiddleware,
    resizeImageMiddleware,
    updateBrandValidator,
    updateBrandService,
  )
  .delete(
    protect,
    allowedTo("admin"),
    deleteBrandValidator,
    deleteBrandService,
  );
module.exports = router;
