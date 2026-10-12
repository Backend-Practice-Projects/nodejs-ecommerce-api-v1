const express = require("express");
const router = express.Router();

const { createCashOrderService } = require("../services/order_service");
const {
  createCashOrderValidator,
} = require("../utils/validators/order_validator");
const { protect, allowedTo } = require("../services/auth_service");

router.use(protect, allowedTo("user"));

router.route("/").post(createCashOrderValidator, createCashOrderService);

module.exports = router;
