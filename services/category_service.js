/**
 * You need to parse the json in the middleware before accessing it bacause
 * it comes in encoded string format and we need to convert to json or you
 * will see TypeError: Cannot read properties of undefined
 */
/**
 * You can use service for logics and controllers for endpoints as an architecture
 */

const CategoriesDoc = require("../models/category_model");
const slugify = require("slugify");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");
const ApiCommonFeatures = require("../utils/api_common_features");

// @desc    Get list of categories
// @route   GET /api/v1/categories
// @access  Public
//Note: You can also do exports.getCategoryService in the same line rather than const getCategoryService
const getCategoriesService = asyncHandler(async (req, res, next) => {
  const documentsCount = await CategoriesDoc.countDocuments();
  //Build Query
  const apiCommonFeatures = new ApiCommonFeatures(
    CategoriesDoc.find(),
    req.query,
  )
    .paginate(documentsCount)
    .filter()
    .search()
    .fieldsLimiting()
    .sort();

  const meta = apiCommonFeatures.meta;

  if (meta.isOutOfRange) {
    return next(
      new ApiError(
        `Page ${meta.currentPage} does not exist, maximum page is ${meta.numberOfPages}`,
        404,
      ),
    );
  }

  const categories = await apiCommonFeatures.mongooseQuery;

  res.status(200).json({
    result: categories.length,
    meta,
    data: categories,
  });
});

// @desc    Get specific category by id
// @route   GET /api/v1/categories/:id
// @access  Public
const getCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const category = await CategoriesDoc.findById(id);
  if (!category) {
    /*     return res
      .status(404)
      .json({ message: `No category found for this id ${id}` }); */
    return next(new ApiError(`No category found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: category,
  });
});

// @desc    Update specific category
// @route   PUT /api/v1/categories/:id
// @access  Private
const updateCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;

  const category = await CategoriesDoc.findByIdAndUpdate(
    { _id: id },
    { name: name, slug: slugify(name) },
    { new: true },
  );
  if (!category) {
    return next(new ApiError(`No category found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: category,
  });
});

// @desc    Delete specific category
// @route   DELETE /api/v1/categories/:id
// @access  Private
const deleteCategoryService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const category = await CategoriesDoc.findByIdAndDelete(id);
  if (!category) {
    return next(new ApiError(`No category found for this id ${id}`, 404));
  }
  res.status(204).send();
});

/* const createCategoryService = (req, res, next) => {
  const name = req.body.name;

  // Note: Here you can send the data directly without the param name new CategoriesDoc({ name })

  const categoriesDoc = new CategoriesDoc({ name: name });
  categoriesDoc
    .save()
    .then((doc) => {
      res.json(doc);
    })
    .catch((error) => {
      res.json(error);
    });
}; */

//Check Autocomplete
/* const createCategoryService = (req, res, next) => {
  const categoryName = req.body.name;
  CategoriesDoc.create({
    name: categoryName,
    slug: slugify(categoryName),
  })
    .then((category) => res.status(201).json({data:category}))
    .catch((error) => res.status(400).send(error));
}; */

//Using async await,
/* const createCategoryService = async (req, res, next) => {
  const categoryName = req.body.name;
  try {
    const category = await CategoriesDoc.create({
      name: categoryName,
      slug: slugify(categoryName),
    });
    res.status(201).json({ data: category });
  } catch (error) {
    //If you didn't add catch the app will crash CHECK
    res.send(error);
  }
}; */

/**
 * In Express, req.params returns the dynamic parameters from the URL path: /users/:id.
 * If you request: GET /users/123 Then: req.params is { id: "123" } and
 * req.params.id is "123". You can receive as follow: const { id } = request.params
 */

/**
 * asyncHandler is a Simple middleware for handling exceptions inside of async express routes and passing them to
 * your express error handlers.
 * Note: Using asyncHandler same as  async await, with typescript we use req: Request, res: Response
 */

// @desc    Create category
// @route   POST  /api/v1/categories
// @access  Private
const createCategoryService = asyncHandler(async (req, res) => {
  const categoryName = req.body.name;

  const category = await CategoriesDoc.create({
    name: categoryName,
    slug: slugify(categoryName),
  });
  res.status(201).json({ data: category });
});

//If we need to import more than one we use {,}
module.exports = {
  getCategoriesService,
  getCategoryService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
};
