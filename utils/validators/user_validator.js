const { check, body } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");
const slugify = require("slugify");

const UserDoc = require("../../models/user_model");

exports.createUserValidator = [
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
  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage(
      "Invalid Phone Number, only Egyptian and Saudi Arabian numbers are accepted",
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
  check("profileImg").optional(),
  check("role").optional().isIn(["user", "admin"]).withMessage("Invalid Role"),
  requestValidatorMiddleware,
];
exports.getUserValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
exports.updateUserValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("User Name length must not be less than three character")
    .custom((name, { req }) => {
      req.body.slug = slugify(name);
      return true;
    }),
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid Email Address")
    .custom((email, { req }) =>
      UserDoc.findOne({ email }).then((user) => {
        if (user && user._id.toString() !== req.params.id) {
          return Promise.reject(new Error("Email already in use"));
        }
      }),
    ),
  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage(
      "Invalid Phone Number, only Egyptian and Saudi Arabian numbers are accepted",
    ),
  check("profileImg").optional(),
  check("role").optional().isIn(["user", "admin"]).withMessage("Invalid Role"),
  requestValidatorMiddleware,
];
exports.deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
