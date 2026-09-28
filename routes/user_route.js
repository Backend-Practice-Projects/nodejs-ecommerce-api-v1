const express = require("express");
const router = express.Router();
const {
  getUserValidator,
  updateUserValidator,
  changeUserPasswordValidator,
  updateLoggedUserPasswordValidator,
  updateLoggedUserDataValidator,
  deleteUserValidator,
  createUserValidator,
} = require("../utils/validators/user_validator");

const {
  getUsersService,
  getUserService,
  getLoggedUserDataService,
  createUserService,
  updateUserService,
  updateLoggedUserDataService,
  deactivateLoggedUserDataService,
  changeUserPasswordService,
  updateLoggedUserPasswordService,
  allowSelfOrAdmin,
  deleteUserService,
  uploadUserImageMiddleware,
  resizeImageMiddleware,
} = require("../services/user_service");

const { protect, allowedTo } = require("../services/auth_service");

/*
  Use router.use(...isAdmin) instead when EVERY route in the router shares
  the same authorization rule, e.g.:

    router.use(...isAdmin);
    router.route("/").post(createUserService).get(getUsersService);

  Not used here because /changePassword/:id needs allowSelfOrAdmin instead.
*/
const isAdmin = [protect, allowedTo("admin")];

router
  .route("/")
  .post(
    ...isAdmin,
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    createUserValidator,
    createUserService,
  )
  .get(...isAdmin, getUsersService);

/*
 * Must be registered before /:id. Express matches routes top to bottom and
 * stops at the first match (1), and /:id matches any single path segment
 * including "getMe" (2), so if /:id came first it would swallow this
 * request and the getMe route below would never be reached (4).
 *
 * Rule: specific/static routes (/getMe, /search, /stats) must be registered
 * before generic dynamic routes (/:id) that could accidentally swallow
 * them. Same principle as ordering catch clauses or switch cases from
 * most-specific to least-specific.
 */
router.route("/getMe").get(protect, getLoggedUserDataService);

router
  .route("/updateMe")
  .put(
    protect,
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    updateLoggedUserDataValidator,
    updateLoggedUserDataService,
  );

router
  .route("/updateMyPassword")
  .put(
    protect,
    updateLoggedUserPasswordValidator,
    updateLoggedUserPasswordService,
  );

router.route("/deactivateMe").put(protect, deactivateLoggedUserDataService);

router
  .route("/:id")
  .get(...isAdmin, getUserValidator, getUserService)
  .put(
    ...isAdmin,
    uploadUserImageMiddleware,
    resizeImageMiddleware,
    updateUserValidator,
    updateUserService,
  )
  .delete(...isAdmin, deleteUserValidator, deleteUserService);

router
  .route("/changePassword/:id")
  .put(
    protect,
    allowSelfOrAdmin,
    changeUserPasswordValidator,
    changeUserPasswordService,
  );

module.exports = router;
