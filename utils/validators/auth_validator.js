const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const slugify = require("slugify");

const UserDoc = require("../../models/user_model");

exports.userSignUpValidator = [
  check("name")
    .notEmpty()
    .withMessage("User Name is required")
    .trim()
    .isLength({ min: 3 })
    .withMessage("User Name length must not be less than three character")
    .custom((name, { req }) => {
      req.body.slug = slugify(name);
      return true;
    }),
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email Address")
    .custom((email) =>
      UserDoc.findOne({ email }).then((user) => {
        if (user) {
          return Promise.reject(new Error("Email already in use"));
        }
      }),
    ),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password length must not be less than six character")
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error("Password Confirmation does not match Password");
      }
      return true;
    }),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("Password Confirmation is required"),

  requestValidatorMiddleware,
];

exports.userLoginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email Address"),

  check("password").notEmpty().withMessage("Password is required"),

  requestValidatorMiddleware,
];

exports.forgotPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email Address"),

  requestValidatorMiddleware,
];

exports.verifyPasswordResetCodeValidator = [
  check("resetCode").notEmpty().withMessage("Reset code is required"),

  requestValidatorMiddleware,
];

exports.resetPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email Address"),

  check("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password length must not be less than six character"),

  requestValidatorMiddleware,
];
