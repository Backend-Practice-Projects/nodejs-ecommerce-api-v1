const express = require("express");
const router = express.Router();
const {
  getCouponValidator,
  updateCouponValidator,
  deleteCouponValidator,
  createCouponValidator,
} = require("../utils/validators/coupon_validator");

const {
  getCouponsService,
  getCouponService,
  createCouponService,
  updateCouponService,
  deleteCouponService,
} = require("../services/coupon_service");

const { protect, allowedTo } = require("../services/auth_service");

//Coupons are managed by the store only, so every route below is protected
router.use(protect, allowedTo("admin", "manager"));

router
  .route("/")
  .post(createCouponValidator, createCouponService)
  .get(getCouponsService);

router
  .route("/:id")
  .get(getCouponValidator, getCouponService)
  .put(updateCouponValidator, updateCouponService)
  .delete(deleteCouponValidator, deleteCouponService);

module.exports = router;
