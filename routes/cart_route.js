const express = require("express");
const router = express.Router();

const {
  addProductToCartService,
  getLoggedUserCartService,
  updateCartItemQuantityService,
  removeCartItemService,
  clearCartService,
  applyCouponService,
} = require("../services/cart_service");

const {
  addProductToCartValidator,
  updateCartItemQuantityValidator,
  removeCartItemValidator,
  applyCouponValidator,
} = require("../utils/validators/cart_validator");

const { protect, allowedTo } = require("../services/auth_service");

router.use(protect, allowedTo("user"));

router
  .route("/")
  .post(addProductToCartValidator, addProductToCartService)
  .get(getLoggedUserCartService)
  .delete(clearCartService);

//Must stay above /:itemId, otherwise "applyCoupon" is matched as an itemId
router.put("/applyCoupon", applyCouponValidator, applyCouponService);

router
  .route("/:itemId")
  .put(updateCartItemQuantityValidator, updateCartItemQuantityService)
  .delete(removeCartItemValidator, removeCartItemService);

module.exports = router;
