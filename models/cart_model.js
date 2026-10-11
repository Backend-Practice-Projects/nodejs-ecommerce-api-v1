const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
          required: [true, "Cart item must belong to product"],
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Cart item quantity must not be less than 1"],
        },
        color: String,
        //Product price at the time it was added to the cart
        price: {
          type: Number,
          required: [true, "Cart item price is required"],
        },
      },
    ],
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    /*
     * One cart per user.
     *
     * unique makes MongoDB itself guarantee one cart per user, and it also creates
     * an index on user, which speeds up the findOne({ user }) lookup that every
     * cart endpoint runs.
     *
     * The case it protects against: a user with no cart double-clicks "Add to cart",
     * so two requests arrive at the same moment. Both run findOne, both see no cart,
     * and both create one. Without unique, the user ends up with two carts and later
     * requests pick one of them unpredictably, so items seem to disappear. With
     * unique, the second insert is rejected with an E11000 duplicate key error and
     * only one cart exists.
     *
     * In that case the losing request currently comes back as a raw 500 error
     * rather than a friendly message.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Cart must belong to user"],
      unique: true,
    },
  },
  { timestamps: true },
);

const CartDoc = mongoose.model("Cart", cartSchema);

module.exports = CartDoc;
