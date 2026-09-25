const express = require("express");
const router = express.Router();
//const { param,validationResult } = require("express-validator");
const {
  getCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  createCategoryValidator,
  getCategorySubCategoriesValidator,
} = require("../utils/validators/category_validator");

/**
 * Note: Use the following if you export this service directly:
 * const { getCategoryService } = require("../services/category_service");
 */

//If we need to import more than one we use {,}
const {
  getCategoriesService,
  getCategoryService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  uploadCategoryImageMiddleware,
  resizeImageMiddleware,
} = require("../services/category_service");

const subCategoriesRoute = require("./sub_category_route");

router.use(
  "/:categoryId/subcategories",
  getCategorySubCategoriesValidator,
  subCategoriesRoute,
);

//router.post("/", getCategoryService);
router
  .route("/")
  .post(
    uploadCategoryImageMiddleware,
    resizeImageMiddleware,
    //We added this request handler middleware to test that multter attach the file to req
    function (req, res, next) {
      // req.file is the `image` file
      // req.body will hold the text fields, if there were any
      console.log(req.file, req.body);
      next();
    },
    createCategoryValidator,
    createCategoryService,
  )
  .get(getCategoriesService);

router
  //The param should be case sensitive with the one in the service module
  .route("/:id")
  .get(
    getCategoryValidator,
    /*.get(
    //1. Rules
    param("id").isMongoId().withMessage("Invalid Mongo ID"),
    //2. Middleware that catch any errors from rules if exist
    (req, res) => {
      const result = validationResult(req);
      if (!result.isEmpty()) {
        res.status(400).send({ errors: result.array() });
      }
    }, */
    /**
     * Note: The validation layer helps improve performance by preventing unnecessary
     * calls to the DB server and logic module, allowing only valid requests to proceed.
     */
    getCategoryService,
  )
  .put(
    uploadCategoryImageMiddleware,
    resizeImageMiddleware,
    updateCategoryValidator,
    updateCategoryService,
  )
  .delete(deleteCategoryValidator, deleteCategoryService);
module.exports = router;
