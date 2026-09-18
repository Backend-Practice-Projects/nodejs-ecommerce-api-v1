const SubCategory = require("../models/sub_category_model");
const factory = require("../services/handlers_factory");

exports.assignCategoryIdMiddleWare = (req, res, next) => {
  //Nested Route
  if (!req.body.category) req.body.category = req.params.categoryId;
  next();
};

/**
 * Nested Route: It is to access specific route from another route like accessing subcategories that belong to specific product.
 */
exports.filterObjectMiddleware = (req, res, next) => {
  let filterObject = {};
  if (req.params.categoryId) filterObject = { category: req.params.categoryId };
  req.filterObject = filterObject;
  next();
};

// @desc    Get list of sub categories
// @route   GET /api/v1/subcategories
// @access  Public
exports.getSubCategoriesService = factory.getAll(SubCategory);

/**
 * Using population which means to return the the object or specific items from that object rather than
 * returning the forign key. It do another query after the first one find().
 */
/*   const subCategories = await SubCategory.find()
    .skip(skip)
    .limit(limit)
    //.populate("category");
    //.populate({ path: "category", select: "name" });
    .populate({ path: "category", select: "name-_id" }); */

// @desc    Get specific sub category by id
// @route   GET /api/v1/subcategories/:id
// @access  Public
exports.getSubCategoryService = factory.getOne(SubCategory);

// @desc    Create SubCategory
// @route   POST /api/v1/Subcategories
// @access  Private
exports.createSubCategoryService = factory.createOne(SubCategory);

// @desc    Update specific sub category
// @route   PUT /api/v1/subcategories/:id
// @access  Private
exports.updateSubCategoryService = factory.updateOne(SubCategory);

// @desc    Delete specific sub category
// @route   DELETE /api/v1/subcategories/:id
// @access  Private
exports.deleteSubCategoryService = factory.deleteOne(SubCategory);
