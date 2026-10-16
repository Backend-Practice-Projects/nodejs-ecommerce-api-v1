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

/*
 * Decrements stock for every cart item and returns false if any item is out of
 * stock or deleted. Shared by the cash order and the Stripe webhook.
 */
const reserveStock = async (cartItems) => {
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
    cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product, quantity: { $gte: item.quantity } },
        update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
      },
    })),
  );
  return matchedCount === cartItems.length;
};

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

  const inStock = await reserveStock(cart.cartItems);
  if (!inStock) {
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

// @desc    Stripe webhook, creates the paid card order once checkout completes
// @route   POST /webhook-checkout
// @access  Public (called by Stripe, authenticated by its signature)
exports.webhookCheckoutService = asyncHandler(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET);
  let event;
  try {
    //req.body must be the raw Buffer, the signature is computed over the exact bytes
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const cart = await CartDoc.findById(session.client_reference_id);

    /*
     * Stripe retries on any non-2xx, and the cart is deleted after the first
     * success, so a missing cart means this event was already handled.
     */
    if (cart) {
      const { details, phone, city, postalCode } = session.metadata;

      /*
       * The order is created before touching stock. stripeSessionId has a
       * unique index, so if two copies of the same event arrive at the same
       * moment (both found the cart), only one create succeeds. The other gets
       * a duplicate key error (code 11000) and stops, so stock is not
       * decremented twice.
       */
      try {
        await OrderDoc.create({
          user: cart.user,
          cartItems: cart.cartItems,
          shippingAddress: { details, phone, city, postalCode },
          taxPrice: TAX_PRICE,
          shippingPrice: SHIPPING_PRICE,
          //Stripe's amount is what was actually charged, in piasters
          totalOrderPrice: session.amount_total / 100,
          paymentMethodType: "card",
          isPaid: true,
          paidAt: Date.now(),
          stripeSessionId: session.id,
        });
      } catch (err) {
        //Already handled by another delivery of this event, acknowledge it
        if (err.code === 11000) return res.status(200).json({ received: true });
        /*
         * Any other error (e.g. a temporary database failure) is rethrown, which
         * hands it back to asyncHandler. It forwards it to the global error
         * handler, which replies with a 500, and Stripe retries later. Replying
         * 200 here instead would make Stripe think the order was created, so it
         * would never retry and the paid order would be lost.
         */
        throw err;
      }

      /*
       * Known limitation: the order is created above and the stock is updated
       * here, not all-or-nothing.
       *
       * If the server crashes after the order is created but before this call
       * finishes, Stripe retries the event, the create hits the duplicate key
       * error above and returns early, so the stock is never decremented for
       * that order. The gap is only the few milliseconds between two database
       * calls, so it is unlikely.
       *
       * A transaction around the create, the stock update and the cart delete
       * would roll all of it back on a crash, but it needs a replica set and
       * Atlas has one by default.
       */
      const inStock = await reserveStock(cart.cartItems);
      if (!inStock) {
        //The customer already paid, so this needs a manual refund
        console.error(
          `Stripe session ${session.id} paid but some items are out of stock`,
        );
      }

      await CartDoc.findByIdAndDelete(cart._id);
    }
  }

  res.status(200).json({ received: true });
});
