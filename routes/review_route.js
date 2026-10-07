const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  getReviewsService,
  getReviewService,
  createReviewService,
  updateReviewService,
  deleteReviewService,
  filterObjectMiddleware,
  assignProductAndUserMiddleware,
  checkReviewOwnershipMiddleware,
} = require("../services/review_service");

const {
  createReviewValidator,
  getReviewValidator,
  getReviewsValidator,
  updateReviewValidator,
  deleteReviewValidator,
} = require("../utils/validators/review_validator");

const { protect, allowedTo } = require("../services/auth_service");

router
  .route("/")
  .post(
    protect,
    allowedTo("user"),
    assignProductAndUserMiddleware,
    createReviewValidator,
    createReviewService,
  )
  .get(getReviewsValidator, filterObjectMiddleware, getReviewsService);

router
  .route("/:id")
  .get(getReviewValidator, getReviewService)
  .put(
    protect,
    allowedTo("user"),
    updateReviewValidator,
    checkReviewOwnershipMiddleware,
    updateReviewService,
  )
  .delete(
    protect,
    allowedTo("user", "manager", "admin"),
    deleteReviewValidator,
    checkReviewOwnershipMiddleware,
    deleteReviewService,
  );

module.exports = router;
