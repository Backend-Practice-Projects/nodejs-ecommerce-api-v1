const express = require("express");
const router = express.Router();

const {
  addAddressService,
  removeAddressService,
  getLoggedUserAddressesService,
} = require("../services/address_service");

const {
  addAddressValidator,
  removeAddressValidator,
} = require("../utils/validators/address_validator");

const { protect, allowedTo } = require("../services/auth_service");

router.use(protect, allowedTo("user"));

router
  .route("/")
  .post(addAddressValidator, addAddressService)
  .get(getLoggedUserAddressesService);

router
  .route("/:addressId")
  .delete(removeAddressValidator, removeAddressService);

module.exports = router;
