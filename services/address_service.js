const asyncHandler = require("express-async-handler");
const UserDoc = require("../models/user_model");

// @desc    Add address to logged-in user's addresses
// @route   POST /api/v1/addresses
// @access  Private/User
exports.addAddressService = asyncHandler(async (req, res, next) => {
  const { alias, details, phone, city, postalCode } = req.body;

  const user = await UserDoc.findByIdAndUpdate(
    req.user._id,
    /*
     * $push instead of $addToSet: every embedded address gets a fresh _id, so
     * no two are ever an exact match and $addToSet would never dedupe them.
     * Both behave the same here, so $push is used because it is honest: it
     * says "append an element", while $addToSet would wrongly signal that
     * duplicates are prevented. It also skips the comparison against every
     * existing element that $addToSet performs.
     */
    { $push: { addresses: { alias, details, phone, city, postalCode } } },
    { new: true },
  );

  res.status(200).json({
    status: "success",
    message: "Address added successfully",
    data: user.addresses,
  });
});

// @desc    Remove address from logged-in user's addresses
// @route   DELETE /api/v1/addresses/:addressId
// @access  Private/User
exports.removeAddressService = asyncHandler(async (req, res, next) => {
  const user = await UserDoc.findByIdAndUpdate(
    req.user._id,
    /*
     * $pull with a condition removes the embedded address whose _id matches.
     * Unlike the wishlist, which holds plain product ObjectIds and can be
     * pulled by value ({ wishlist: productId }), addresses holds objects, so
     * { addresses: addressId } would compare a whole object against an id,
     * match nothing and remove nothing.
     * { addresses: { _id: addressId } } means "remove the element whose _id
     * equals this id".
     */
    { $pull: { addresses: { _id: req.params.addressId } } },
    { new: true },
  );

  res.status(200).json({
    status: "success",
    message: "Address removed successfully",
    data: user.addresses,
  });
});

// @desc    Get logged-in user's addresses
// @route   GET /api/v1/addresses
// @access  Private/User
exports.getLoggedUserAddressesService = asyncHandler(async (req, res, next) => {
  //No populate needed: addresses are embedded in the user document
  const user = await UserDoc.findById(req.user._id);

  res.status(200).json({
    status: "success",
    results: user.addresses.length,
    data: user.addresses,
  });
});
