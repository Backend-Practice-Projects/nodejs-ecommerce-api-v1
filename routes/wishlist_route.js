const express = require("express");
const router = express.Router();

const {
  addProductToWishlistService,
  removeProductFromWishlistService,
  getLoggedUserWishlistService,
} = require("../services/wishlist_service");

const {
  addProductToWishlistValidator,
  removeProductFromWishlistValidator,
} = require("../utils/validators/wishlist_validator");

const { protect, allowedTo } = require("../services/auth_service");

//Every route in this router shares the same authorization rule
router.use(protect, allowedTo("user"));

router
  .route("/")
  .post(addProductToWishlistValidator, addProductToWishlistService)
  .get(getLoggedUserWishlistService);

router
  .route("/:productId")
  .delete(removeProductFromWishlistValidator, removeProductFromWishlistService);

module.exports = router;
