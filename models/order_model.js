const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Order must belong to user"],
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        color: String,
        //Product price at the time the order was placed
        price: Number,
      },
    ],
    taxPrice: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    totalOrderPrice: {
      type: Number,
      required: [true, "Order total price is required"],
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash"],
      default: "cash",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
    /*
     * Snapshot of the address at order time, not a ref to user.addresses,
     * so later edits or removal of that address don't change past orders.
     */
    shippingAddress: {
      details: String,
      phone: String,
      city: String,
      postalCode: String,
    },
  },
  { timestamps: true },
);

const OrderDoc = mongoose.model("Order", orderSchema);

module.exports = OrderDoc;
