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
router
  .route("/")
  .post(
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
    uploadBrandImageMiddleware,
    resizeImageMiddleware,
    updateBrandValidator,
    updateBrandService,
  )
  .delete(deleteBrandValidator, deleteBrandService);
module.exports = router;
