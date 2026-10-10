const { check } = require("express-validator");
const requestValidatorMiddleware = require("../../middlewares/request_validator_middleware");

/*
 * The (value = "") default covers a missing field (e.g. an old address saved
 * without a city), which would otherwise crash on undefined.trim().
 * It is only used for comparing; the stored value keeps its original casing.
 */
const normalize = (value = "") => value.trim().toLowerCase();

/*
 * Duplicate checks read req.user.addresses, which protect already loaded for
 * this request, so no extra query is needed. Comparison ignores case and
 * surrounding spaces, so "Home" and " home " count as the same.
 * Note: v (a value) to contrast with some(fn), where you pass a function that tests each element.
 *
 * Why some() and not the other array methods:
 *   some(fn)     - true if AT LEAST ONE element passes the test, and stops at
 *                  the first match. Use it to ask "does any element match
 *                  this condition?". JavaScript has no any(); some() is the
 *                  same thing as any() in Python, C# or Kotlin.
 *   every(fn)    - the opposite question: true only if ALL elements pass.
 *   includes(v)  - true if the array contains that exact value (===). Use it
 *                  for primitives: roles.includes("admin"). It can't be used
 *                  here because it takes a value, not a test, so it can't
 *                  look inside objects or ignore case.
 *   map(fn)      - doesn't answer a yes/no question; it returns a new array
 *                  of the same length with each element transformed. Use it
 *                  to convert data: addresses.map((a) => a.alias).
 *   find(fn)     - like some(), but returns the matching element itself
 *                  instead of true/false. Use it when you need the object.
 *   filter(fn)   - returns all matching elements as a new array.
 */
exports.addAddressValidator = [
  check("alias")
    .trim()
    .notEmpty()
    .withMessage("Address alias required")
    .custom((alias, { req }) => {
      const exists = req.user.addresses.some(
        (address) => normalize(address.alias) === normalize(alias),
      );
      if (exists) {
        throw new Error(`You already have an address named ${alias}`);
      }
      return true;
    }),
  check("details")
    .trim()
    .notEmpty()
    .withMessage("Address details required")
    //Same address = same details in the same city, whatever the alias is
    .custom((details, { req }) => {
      const exists = req.user.addresses.some(
        (address) =>
          normalize(address.details) === normalize(details) &&
          normalize(address.city) === normalize(req.body.city),
      );
      if (exists) {
        throw new Error("You already added this address");
      }
      return true;
    }),
  check("phone")
    .notEmpty()
    .withMessage("Phone number required")
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage(
      "Invalid Phone Number, only Egyptian and Saudi Arabian numbers are accepted",
    ),
  check("city").trim().notEmpty().withMessage("City required"),
  check("postalCode")
    .optional()
    .isPostalCode("any")
    .withMessage("Invalid postal code"),
  requestValidatorMiddleware,
];

exports.removeAddressValidator = [
  check("addressId").isMongoId().withMessage("Invalid Mongo ID Format"),
  requestValidatorMiddleware,
];
