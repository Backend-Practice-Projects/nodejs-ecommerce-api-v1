const slugify = require("slugify");
const asyncHandler = require("express-async-handler");

const SubCategory = require("../models/sub_category_model");
const ApiError = require("../utils/api_error");

exports.assignCategoryIdMiddleWare = (req, res, next) => {
  //Nested Route
  if (!req.body.category) req.body.category = req.params.categoryId;
  next();
};

// @desc    Create SubCategory
// @route   POST /api/v1/Subcategories
// @access  Private
exports.createSubCategoryService = asyncHandler(async (req, res) => {
  const { name, category } = req.body;
  const subCategory = await SubCategory.create([
    {
      name,
      slug: slugify(name),
      category,
    },
  ]);
  res.status(201).json({ data: subCategory });
});

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
exports.getSubCategoriesService = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;
  console.log(req.params);

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
  const subCategories = await SubCategory.find(req.filterObject)
    .skip(skip)
    .limit(limit);
  res.status(200).json({
    meta: {
      result: subCategories.length,
      page: page,
      limit: limit,
    },
    data: subCategories,
  });
});

// @desc    Get specific sub category by id
// @route   GET /api/v1/subcategories/:id
// @access  Public
exports.getSubCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const subCategory = await SubCategory.findById(id);
  if (!subCategory) {
    return next(new ApiError(`No sub category found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: subCategory,
  });
});

// @desc    Update specific sub category
// @route   PUT /api/v1/subcategories/:id
// @access  Private
exports.updateSubCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;
  const category = req.body.category;

  const subCategory = await SubCategory.findByIdAndUpdate(
    { _id: id },
    { name: name, slug: slugify(name), category: category },
    { new: true },
  );
  if (!subCategory) {
    return next(new ApiError(`No sub category found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: subCategory,
  });
});

// @desc    Delete specific sub category
// @route   DELETE /api/v1/subcategories/:id
// @access  Private
exports.deleteSubCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const subCategory = await SubCategory.findByIdAndDelete(id);
  if (!subCategory) {
    return next(new ApiError(`No sub category found for this id ${id}`, 404));
  }
  res.status(204).send();
});
