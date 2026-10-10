const asyncHandler = require("express-async-handler");
const UserDoc = require("../models/user_model");

// @desc    Add product to logged-in user's wishlist
// @route   POST /api/v1/wishlist
// @access  Private/User
exports.addProductToWishlistService = asyncHandler(async (req, res, next) => {
  const user = await UserDoc.findByIdAndUpdate(
    req.user._id,
    /*
     * $addToSet only pushes the productId if it isn't already in the array,
     * so no duplicates.
     *
     * When to use: the array should behave like a set of unique values
     * (wishlist, tags, followers, roles). The check and the write happen in
     * one atomic operation on the server, so two parallel requests can't add
     * the same product twice.
     *
     * Alternatives:
     *   $push - always appends, even if the value is already there. Use it
     *           when duplicates are valid or order/history matters (cart
     *           items, logs), or when you need its modifiers ($each with
     *           $position, $slice, $sort).
     *   find + includes() + push + save() - same result in JS, but it costs
     *           two round trips and is not atomic, so parallel requests can
     *           still produce duplicates.
     *
     * Caveat: uniqueness is by exact match. It works for ObjectIds and other
     * primitives; for subdocuments, any differing field (or field order)
     * makes them count as different and both are kept.
     */
    { $addToSet: { wishlist: req.body.productId } },
    { new: true },
  );

  res.status(200).json({
    status: "success",
    message: "Product added successfully to your wishlist",
    data: user.wishlist,
  });
});

// @desc    Remove product from logged-in user's wishlist
// @route   DELETE /api/v1/wishlist/:productId
// @access  Private/User
exports.removeProductFromWishlistService = asyncHandler(
  async (req, res, next) => {
    const user = await UserDoc.findByIdAndUpdate(
      req.user._id,
      /*
       * $pull removes the productId from the array if it exists, and does
       * nothing otherwise.
       *
       * When to use: remove array elements by value or by condition without
       * knowing their position. It removes every match, and also accepts a
       * query, e.g. { $pull: { cartItems: { product: id } } } for
       * subdocuments or { $pull: { scores: { $lt: 50 } } }.
       *
       * Alternatives:
       *   $pullAll - removes all occurrences of several exact values at
       *              once: { $pullAll: { wishlist: [id1, id2] } }.
       *   $pop     - removes only the first (-1) or last (1) element, by
       *              position rather than by value.
       *   find + filter() + save() - same result in JS, but two round trips
       *              and not atomic.
       */
      { $pull: { wishlist: req.params.productId } },
      { new: true },
    );

    res.status(200).json({
      status: "success",
      message: "Product removed successfully from your wishlist",
      data: user.wishlist,
    });
  },
);

// @desc    Get logged-in user's wishlist
// @route   GET /api/v1/wishlist
// @access  Private/User
exports.getLoggedUserWishlistService = asyncHandler(async (req, res, next) => {
  const user = await UserDoc.findById(req.user._id).populate({
    path: "wishlist",
    // select: "title",
    // /*
    //  * skipCategory tells the product pre-find hook not to populate category.
    //  * It is a custom name, not a reserved Mongoose option - it can be anything
    //  * as long as the hook's this.getOptions().<name> check uses the same key.
    //  * Avoid names Mongoose already uses as query options (lean, sort, limit,
    //  * skip, strict, etc.).
    //  */
    // options: { skipCategory: true },
  });

  res.status(200).json({
    status: "success",
    results: user.wishlist.length,
    data: user.wishlist,
  });
});
