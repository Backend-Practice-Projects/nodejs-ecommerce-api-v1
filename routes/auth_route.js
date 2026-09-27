const express = require("express");
const router = express.Router();
const {
  userSignUpValidator,
  userLoginValidator,
} = require("../utils/validators/auth_validator");

const {
  userSignUpService,
  userLoginService,
} = require("../services/auth_service");
router.route("/signUp").post(userSignUpValidator, userSignUpService);
router.route("/login").post(userLoginValidator, userLoginService);

module.exports = router;
