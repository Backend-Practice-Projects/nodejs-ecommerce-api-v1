const express = require("express");
const router = express.Router();
const {
  userSignUpValidator,
  userLoginValidator,
  forgotPasswordValidator,
  verifyPasswordResetCodeValidator,
  resetPasswordValidator,
} = require("../utils/validators/auth_validator");

const {
  userSignUpService,
  userLoginService,
  forgotPasswordService,
  verifyPasswordResetCodeService,
  resetPasswordService,
} = require("../services/auth_service");
router.route("/signUp").post(userSignUpValidator, userSignUpService);
//Another Way
//router.post("/signUp", userSignUpValidator, userSignUpService);

router.route("/login").post(userLoginValidator, userLoginService);

router
  .route("/forgotPassword")
  .post(forgotPasswordValidator, forgotPasswordService);
router
  .route("/verifyResetCode")
  .post(verifyPasswordResetCodeValidator, verifyPasswordResetCodeService);
router.route("/resetPassword").put(resetPasswordValidator, resetPasswordService);

module.exports = router;
