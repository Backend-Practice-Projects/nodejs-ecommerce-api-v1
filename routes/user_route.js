const express = require("express");
const router = express.Router();
const {
  getUserValidator,
  updateUserValidator,
  changeUserPasswordValidator,
  deleteUserValidator,
  createUserValidator,
} = require("../utils/validators/user_validator");

const {
  getUsersService,
  getUserService,
  createUserService,
  updateUserService,
  changeUserPasswordService,
  allowSelfOrAdmin,
  deleteUserService,
  uploadUserImageMiddleware,
  resizeImageMiddleware,
} = require("../services/user_service");

const { protect, allowedTo } = require("../services/auth_service");

router
  .route("/")
  .post(
    protect,
    allowedTo("admin"),
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    createUserValidator,
    createUserService,
  )
  .get(protect, allowedTo("admin"), getUsersService);

router
  .route("/:id")
  .get(protect, allowedTo("admin"), getUserValidator, getUserService)
  .put(
    protect,
    allowedTo("admin"),
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    updateUserValidator,
    updateUserService,
  )
  .delete(protect, allowedTo("admin"), deleteUserValidator, deleteUserService);

router
  .route("/changePassword/:id")
  .put(
    protect,
    allowSelfOrAdmin,
    changeUserPasswordValidator,
    changeUserPasswordService,
  );

module.exports = router;
