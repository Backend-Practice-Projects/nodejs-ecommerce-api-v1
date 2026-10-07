const express = require("express");
const router = express.Router();

const {
  getReviewsService,
  getReviewService,
  createReviewService,
  updateReviewService,
  deleteReviewService,
  assignProductAndUserMiddleware,
  checkReviewOwnershipMiddleware,
} = require("../services/review_service");

const {
  createReviewValidator,
  getReviewValidator,
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
  .get(getReviewsService);

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
