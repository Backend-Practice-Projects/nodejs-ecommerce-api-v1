const express = require("express");
const router = express.Router();
const {
  getUserValidator,
  updateUserValidator,
  deleteUserValidator,
  createUserValidator,
} = require("../utils/validators/user_validator");

const {
  getUsersService,
  getUserService,
  createUserService,
  updateUserService,
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
module.exports = router;
