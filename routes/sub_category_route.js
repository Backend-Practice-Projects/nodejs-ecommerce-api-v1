const express = require("express");
//mergeParams: Allow use to access params belong to other routes
const router = express.Router({ mergeParams: true });
const {
  getSubCategoryValidator,
  updateSubCategoryValidator,
  deleteSubCategoryValidator,
  createSubCategoryValidator,
} = require("../utils/validators/sub_category_validator");

const {
  getSubCategoriesService,
  getSubCategoryService,
  createSubCategoryService,
  updateSubCategoryService,
  deleteSubCategoryService,
  filterObjectMiddleware,
  assignCategoryIdMiddleWare,
} = require("../services/sub_category_service");

const { protect, allowedTo } = require("../services/auth_service");

router
  .route("/")
  .post(
    protect,
    allowedTo("admin", "manager"),
    assignCategoryIdMiddleWare,
    createSubCategoryValidator,
    createSubCategoryService,
  )
  .get(filterObjectMiddleware, getSubCategoriesService);

router
  .route("/:id")
  .get(getSubCategoryValidator, getSubCategoryService)
  .put(
    protect,
    allowedTo("admin", "manager"),
    updateSubCategoryValidator,
    updateSubCategoryService,
  )
  .delete(
    protect,
    allowedTo("admin"),
    deleteSubCategoryValidator,
    deleteSubCategoryService,
  );
module.exports = router;
