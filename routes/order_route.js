const express = require("express");
const router = express.Router();

const {
  createCashOrderService,
  filterOrdersForUserMiddleware,
  getAllOrdersService,
  getSpecificOrderService,
  updateOrderToPaidService,
  updateOrderToDeliveredService,
} = require("../services/order_service");
const {
  createCashOrderValidator,
  getOrderValidator,
} = require("../utils/validators/order_validator");
const { protect, allowedTo } = require("../services/auth_service");

/*
 * Neither one takes priority: Express runs every matching middleware in the
 * order it was registered. This router.use is registered first, so it runs
 * first, then the middleware declared on a later router.route runs after it.
 * The request must pass all of them.
 *
 * Example: if router.use had allowedTo("user", "admin") and a route had
 * allowedTo("user"), an admin passes the first check, fails the second, and
 * gets a 403. So the stricter check effectively wins, and a route-level
 * check can only narrow access, never widen it.
 */
router.use(protect);

router
  .route("/")
  .post(allowedTo("user"), createCashOrderValidator, createCashOrderService)
  .get(
    allowedTo("user", "admin", "manager"),
    filterOrdersForUserMiddleware,
    getAllOrdersService,
  );

router
  .route("/:id")
  .get(
    allowedTo("user", "admin", "manager"),
    getOrderValidator,
    getSpecificOrderService,
  );

router.put(
  "/:id/pay",
  allowedTo("admin", "manager"),
  getOrderValidator,
  updateOrderToPaidService,
);

router.put(
  "/:id/deliver",
  allowedTo("admin", "manager"),
  getOrderValidator,
  updateOrderToDeliveredService,
);

module.exports = router;
