const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");
const CartDoc = require("../models/cart_model");
const OrderDoc = require("../models/order_model");
const ProductDoc = require("../models/product_model");
const factory = require("./handlers_factory");
const Stripe = require("stripe");

//App settings, not per-order input, so the client can't choose them
const TAX_PRICE = 0;
const SHIPPING_PRICE = 0;

// @desc    Create cash order from logged-in user's cart
// @route   POST /api/v1/orders
// @access  Private/User
exports.createCashOrderService = asyncHandler(async (req, res, next) => {
  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart || cart.cartItems.length === 0) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  //Prices were snapshotted into the cart, so the discounted total is used if a coupon was applied
  const cartPrice = cart.totalPriceAfterDiscount ?? cart.totalCartPrice;
  const totalOrderPrice = cartPrice + TAX_PRICE + SHIPPING_PRICE;

  /*
   * For each cart item we build one "update product" instruction, and
   * bulkWrite sends all of them to MongoDB in a single call.
   *
   * filter: find the product with this _id and enough stock
   *         (quantity >= item.quantity).
   * update: $inc subtracts the ordered amount from quantity and adds it to
   *         sold.
   * matchedCount: how many filters found a product. If a product is out of
   *         stock or deleted, its filter matches nothing, so the count is
   *         lower than the number of cart items. That is how we detect the
   *         failure below.
   *
   * Keeping the stock check inside the filter makes this safe when two users
   * buy the last item at the same time: only one of the two updates matches.
   */
  const { matchedCount } = await ProductDoc.bulkWrite(
    cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product, quantity: { $gte: item.quantity } },
        update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
      },
    })),
  );
  if (matchedCount !== cart.cartItems.length) {
    /*
     * Known limitation: the updates are not all-or-nothing.
     *
     * Example: the cart has products A and B, A has enough stock and B does
     * not. A's quantity and sold are already changed in the database, B is
     * untouched, and we return this error without creating an order. Nothing
     * undoes A's change, so if the user retries, A's stock is decremented
     * again and drifts lower than it really is.
     *
     * A transaction would roll A back too, but it needs a replica set and Atlas has one by default.
     */
    return next(
      new ApiError(
        "Some products are out of stock or no longer available",
        400,
      ),
    );
  }

  /*
   * Known limitation: the stock was already updated above, so if create
   * throws, there is no order but the stock stays decremented. The cart is
   * kept, so a retry decrements it again. A transaction around the bulkWrite
   * and this create would roll the stock back.
   */
  const order = await OrderDoc.create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    taxPrice: TAX_PRICE,
    shippingPrice: SHIPPING_PRICE,
    totalOrderPrice,
    paymentMethodType: "cash",
  });

  await CartDoc.findByIdAndDelete(cart._id);

  res.status(201).json({ status: "success", data: order });
});

//Regular users only see their own orders, admin and manager see all of them
exports.filterOrdersForUserMiddleware = (req, res, next) => {
  if (req.user.role === "user") req.filterObject = { user: req.user._id };
  next();
};

// @desc    Get all orders (own orders for a user)
// @route   GET /api/v1/orders
// @access  Private/User-Admin-Manager
exports.getAllOrdersService = factory.getAll(OrderDoc);

// @desc    Get specific order (own order for a user)
// @route   GET /api/v1/orders/:id
// @access  Private/User-Admin-Manager
exports.getSpecificOrderService = asyncHandler(async (req, res, next) => {
  const filter = { _id: req.params.id };
  /*
   * Without this, any logged-in user could read any order by id. That flaw is
   * called IDOR (Insecure Direct Object Reference): the server trusts an id
   * from the client without checking the caller owns that object.
   * Ids aren't secret (they leak via logs, URLs, other responses), and orders
   * hold the shipping address and phone. Admin and manager look up by id alone.
   */
  if (req.user.role === "user") filter.user = req.user._id;

  const order = await OrderDoc.findOne(filter);
  //Same 404 for someone else's order not 403 so its existence isn't revealed
  if (!order) {
    return next(
      new ApiError(`No order found for this id ${req.params.id}`, 404),
    );
  }
  res.status(200).json({ data: order });
});

// @desc    Mark order as paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Private/Admin-Manager
exports.updateOrderToPaidService = asyncHandler(async (req, res, next) => {
  const order = await OrderDoc.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(`No order found for this id ${req.params.id}`, 404),
    );
  }
  order.isPaid = true;
  order.paidAt = Date.now();
  const updatedOrder = await order.save();

  res.status(200).json({ status: "success", data: updatedOrder });
});

// @desc    Mark order as delivered
// @route   PUT /api/v1/orders/:id/deliver
// @access  Private/Admin-Manager
exports.updateOrderToDeliveredService = asyncHandler(
  async (req, res, next) => {
    const order = await OrderDoc.findById(req.params.id);
    if (!order) {
      return next(
        new ApiError(`No order found for this id ${req.params.id}`, 404),
      );
    }
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    const updatedOrder = await order.save();

    res.status(200).json({ status: "success", data: updatedOrder });
  },
);

// @desc    Create Stripe checkout session from logged-in user's cart
// @route   POST /api/v1/orders/checkout-session
// @access  Private/User
exports.createCheckoutSessionService = asyncHandler(async (req, res, next) => {
  const cart = await CartDoc.findOne({ user: req.user._id });
  if (!cart || cart.cartItems.length === 0) {
    return next(new ApiError("There is no cart for this user", 404));
  }

  const cartPrice = cart.totalPriceAfterDiscount ?? cart.totalCartPrice;
  const totalOrderPrice = cartPrice + TAX_PRICE + SHIPPING_PRICE;

  const { details, phone, city, postalCode } = req.body.shippingAddress;

  /*
   * Created per request, not at the top of the file: app.js requires the routes
   * before dotenv.config runs, so process.env.STRIPE_SECRET is still undefined
   * when this module loads.
   */
  const stripe = new Stripe(process.env.STRIPE_SECRET);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    //One line item for the whole cart so the coupon discount is already applied
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "egp",
          //Stripe amounts are in the smallest currency unit (piasters)
          unit_amount: Math.round(totalOrderPrice * 100),
          product_data: { name: `Order for ${req.user.name}` },
        },
      },
    ],
    customer_email: req.user.email,
    client_reference_id: cart._id.toString(),
    //Metadata values are strings, used later to build the order once payment succeeds
    metadata: { details, phone, city, postalCode: postalCode ?? "" },
    success_url: `${process.env.BASE_URL}/api/v1/orders`,
    cancel_url: `${process.env.BASE_URL}/api/v1/cart`,
  });

  res.status(200).json({ status: "success", session });
});
