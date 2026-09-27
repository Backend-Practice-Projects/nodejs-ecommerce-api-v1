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
  deleteUserService,
  uploadUserImageMiddleware,
  resizeImageMiddleware,
} = require("../services/user_service");
router
  .route("/")
  .post(
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    createUserValidator,
    createUserService,
  )
  .get(getUsersService);

router
  .route("/:id")
  .get(getUserValidator, getUserService)
  .put(
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    updateUserValidator,
    updateUserService,
  )
  .delete(deleteUserValidator, deleteUserService);

router
  .route("/changePassword/:id")
  .put(changeUserPasswordValidator, changeUserPasswordService);

module.exports = router;
