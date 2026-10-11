const CouponDoc = require("../models/coupon_model");
const factory = require("../services/handlers_factory");

// @desc    Get list of coupons
// @route   GET /api/v1/coupons
// @access  Private/Admin-Manager
const getCouponsService = factory.getAll(CouponDoc);

// @desc    Get specific coupon by id
// @route   GET /api/v1/coupons/:id
// @access  Private/Admin-Manager
const getCouponService = factory.getOne(CouponDoc);

// @desc    Create coupon
// @route   POST  /api/v1/coupons
// @access  Private/Admin-Manager
const createCouponService = factory.createOne(CouponDoc);

// @desc    Update specific coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private/Admin-Manager
const updateCouponService = factory.updateOne(CouponDoc);

// @desc    Delete specific coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private/Admin-Manager
const deleteCouponService = factory.deleteOne(CouponDoc);

module.exports = {
  getCouponsService,
  getCouponService,
  createCouponService,
  updateCouponService,
  deleteCouponService,
};
