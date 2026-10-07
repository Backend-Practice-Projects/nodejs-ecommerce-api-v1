const asyncHandler = require("express-async-handler");
const ReviewDoc = require("../models/review_model");
const factory = require("../services/handlers_factory");
const ApiError = require("../utils/api_error");

//Nested Route: POST /products/:productId/reviews
exports.assignProductAndUserMiddleware = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.productId;
  req.body.user = req.user._id;
  next();
};

//Nested Route: GET /products/:productId/reviews
exports.filterObjectMiddleware = (req, res, next) => {
  let filterObject = {};
  if (req.params.productId) filterObject = { product: req.params.productId };
  req.filterObject = filterObject;
  next();
};

//Users can only modify their own reviews, admins and managers can delete any review
//You can also make this at the validation layer
exports.checkReviewOwnershipMiddleware = asyncHandler(
  async (req, res, next) => {
    const review = await ReviewDoc.findById(req.params.id);
    if (!review) {
      return next(
        new ApiError(`No review found for this id ${req.params.id}`, 404),
      );
    }
    /**
     * Make sure to use  review.user._id because if you used populate
     * review.user will include other values in addition to the _id
     */
    const isOwner = review.user._id.toString() === req.user._id.toString();

    const isStaff = ["admin", "manager"].includes(req.user.role);
    const isDelete = req.method === "DELETE";
    if (!isOwner && !(isDelete && isStaff)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403),
      );
    }
    /* Only matters for PUT: updateOne passes req.body straight into the update and the update validator
       doesn't check user/product, so without this an owner could send another user's id (hand the review
       over) or another product's id (move it, bypassing the one-review-per-product check on create).
       DELETE requests usually have no body, so req.body can be undefined. */
    if (req.body) {
      delete req.body.user;
      delete req.body.product;
    }
    next();
  },
);

// @desc    Get list of reviews
// @route   GET /api/v1/reviews
// @access  Public
exports.getReviewsService = factory.getAll(ReviewDoc);

// @desc    Get specific review by id
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReviewService = factory.getOne(ReviewDoc);

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private/User
exports.createReviewService = factory.createOne(ReviewDoc);

// @desc    Update specific review
// @route   PUT /api/v1/reviews/:id
// @access  Private/User (owner)
exports.updateReviewService = factory.updateOne(ReviewDoc);

// @desc    Delete specific review
// @route   DELETE /api/v1/reviews/:id
// @access  Private/User (owner), Admin, Manager
exports.deleteReviewService = factory.deleteOne(ReviewDoc);
