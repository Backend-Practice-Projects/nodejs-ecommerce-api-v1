const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");
const CartDoc = require("../models/cart_model");
const ProductDoc = require("../models/product_model");
const CouponDoc = require("../models/coupon_model");

/* Any change to the items makes an applied coupon's total stale, so we reset
   totalPriceAfterDiscount here and the user has to apply the coupon again. */
const calcTotalCartPrice = (cart) => {
  let totalPrice = 0;
  cart.cartItems.forEach((item) => {
    totalPrice += item.quantity * item.price;
  });
  cart.totalCartPrice = totalPrice;
  cart.totalPriceAfterDiscount = undefined;
};

const sendCartResponse = (res, cart, message) => {
  res.status(200).json({
    status: "success",
    message,
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
};

// @desc    Add product to logged-in user's cart
// @route   POST /api/v1/cart
// @access  Private/User
exports.addProductToCartService = asyncHandler(async (req, res, next) => {
  const { productId, color, quantity = 1 } = req.body;

  const product = await ProductDoc.findById(productId);
  if (!product) {
    return next(new ApiError(`No product found for this id ${productId}`, 404));
  }

  let cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart) {
    cart = new CartDoc({ user: req.user._id, cartItems: [] });
  }

  //Same product with a different color is a separate cart item
  let cartItem = cart.cartItems.find(
    (item) => item.product._id.toString() === productId && item.color === color,
  );
  if (cartItem) {
    cartItem.quantity += quantity;
  } else {
    cart.cartItems.push({
      product: productId,
      color,
      quantity,
      price: product.price,
    });
    cartItem = cart.cartItems[cart.cartItems.length - 1];
  }

  if (cartItem.quantity > product.quantity) {
    return next(
      new ApiError(`Only ${product.quantity} items available in stock`, 400),
    );
  }

  calcTotalCartPrice(cart);
  await cart.save();

  sendCartResponse(res, cart, "Product added successfully to your cart");
});

// @desc    Get logged-in user's cart
// @route   GET /api/v1/cart
// @access  Private/User
exports.getLoggedUserCartService = asyncHandler(async (req, res, next) => {
  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  sendCartResponse(res, cart);
});

// @desc    Update specific cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Private/User
exports.updateCartItemQuantityService = asyncHandler(async (req, res, next) => {
  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  //id() is a Mongoose helper that finds a subdocument by its _id
  const cartItem = cart.cartItems.id(req.params.itemId);
  if (!cartItem) {
    return next(
      new ApiError(`No cart item found for this id ${req.params.itemId}`, 404),
    );
  }

  const product = await ProductDoc.findById(cartItem.product);
  if (!product) {
    return next(new ApiError("This product is no longer available", 404));
  }
  if (req.body.quantity > product.quantity) {
    return next(
      new ApiError(`Only ${product.quantity} items available in stock`, 400),
    );
  }

  cartItem.quantity = req.body.quantity;
  calcTotalCartPrice(cart);
  await cart.save();

  sendCartResponse(res, cart, "Cart item quantity updated successfully");
});

// @desc    Remove specific item from logged-in user's cart
// @route   DELETE /api/v1/cart/:itemId
// @access  Private/User
exports.removeCartItemService = asyncHandler(async (req, res, next) => {
  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  /* We check the item first instead of running $pull directly, because $pull does
     nothing when no item matches and the request would still report success. */
  const cartItem = cart.cartItems.id(req.params.itemId);
  if (!cartItem) {
    return next(
      new ApiError(`No cart item found for this id ${req.params.itemId}`, 404),
    );
  }

  cart.cartItems.pull(cartItem._id);
  calcTotalCartPrice(cart);
  await cart.save();

  sendCartResponse(res, cart, "Item removed successfully from your cart");
});

// @desc    Clear logged-in user's cart
// @route   DELETE /api/v1/cart
// @access  Private/User
exports.clearCartService = asyncHandler(async (req, res, next) => {
  await CartDoc.findOneAndDelete({ user: req.user._id });
  res.status(204).send();
});

// @desc    Apply coupon on logged-in user's cart
// @route   PUT /api/v1/cart/applyCoupon
// @access  Private/User
exports.applyCouponService = asyncHandler(async (req, res, next) => {
  //Coupon names are stored trimmed and uppercased
  const coupon = await CouponDoc.findOne({
    name: req.body.coupon.trim().toUpperCase(),
    expire: { $gt: Date.now() },
  });
  if (!coupon) {
    return next(new ApiError("Coupon is invalid or expired", 400));
  }

  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  const totalPrice = cart.totalCartPrice;
  /*
   * toFixed returns a string, Mongoose casts it back to a Number.
   *
   * Mongoose does it automatically because of
   * the schema. In cart_model.js the field is declared as
   * totalPriceAfterDiscount: Number, so when we assign the string from toFixed(2)
   * (e.g. "360.00"), Mongoose converts it to the number 360 at the moment of
   * assignment.
   *
   * A value that can't be converted, like "abc", would instead fail with a
   * validation error on save().
   */
  cart.totalPriceAfterDiscount = (
    totalPrice -
    (totalPrice * coupon.discount) / 100
  ).toFixed(2);
  await cart.save();

  sendCartResponse(res, cart, "Coupon applied successfully");
});
