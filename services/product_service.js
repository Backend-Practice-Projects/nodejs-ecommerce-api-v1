const ProductDoc = require("../models/product_model");
const slugify = require("slugify");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");
const ApiCommonFeatures = require("../utils/api_common_features");

// @desc    Get list of products
// @route   GET /api/v1/products
// @access  Public

const getProductsService = asyncHandler(async (req, res, next) => {
  //Counts the number of documents that match filter if it is exist
  const documentsCount = await ProductDoc.countDocuments();
  //Build Query
  const apiCommonFeatures = new ApiCommonFeatures(ProductDoc.find(), req.query)
    .paginate(documentsCount)
    .filter()
    .search("Product")
    .fieldsLimiting()
    .sort();

  const meta = apiCommonFeatures.meta;
  // Edge case: requested page is beyond the last page (e.g. page=100 when
  // only 3 exist) - without this check we'd silently return an empty array
  // instead of telling the client the page doesn't exist.
  if (meta.isOutOfRange) {
    return next(
      new ApiError(
        `Page ${meta.currentPage} does not exist, maximum page is ${meta.numberOfPages}`,
        404,
      ),
    );
  }

  // Edge case: populate must run on the raw mongooseQuery, not chained on
  // ApiCommonFeatures - the class has no populate() method, so chaining it
  // there throws "populate is not a function".
  const products = await apiCommonFeatures.mongooseQuery.populate({
    path: "category",
    select: "name-_id",
  });

  //Sending The API Response
  res.status(200).json({
    result: products.length,
    meta,
    data: products,
  });
});

// @desc    Get specific product by id
// @route   GET /api/v1/products/:id
// @access  Public
const getProductService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const product = await ProductDoc.findById(id).populate({
    path: "category",
    select: "name-_id",
  });
  if (!product) {
    return next(new ApiError(`No product found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: product,
  });
});

// @desc    Update specific product
// @route   PUT /api/v1/products/:id
// @access  Private
const updateProductService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  if (req.body.title) {
    req.body.slug = slugify(req.body.title);
  }
  const product = await ProductDoc.findByIdAndUpdate({ _id: id }, req.body, {
    new: true,
  });
  if (!product) {
    return next(new ApiError(`No product found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: product,
  });
});

// @desc    Delete specific product
// @route   DELETE /api/v1/products/:id
// @access  Private
const deleteProductService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const product = await ProductDoc.findByIdAndDelete(id);
  if (!product) {
    return next(new ApiError(`No product found for this id ${id}`, 404));
  }
  res.status(204).send();
});

// @desc    Create product
// @route   POST  /api/v1/products
// @access  Private
const createProductService = asyncHandler(async (req, res) => {
  const requestBody = req.body;

  /**
   * The Mongoose schema-level validators (max, min, maxlength, etc.) don't run until
   * you call .save()/.create(), which happens after your Express-validator
   * middleware chain already passed the request through.
   */
  const product = await ProductDoc.create({
    ...requestBody,
    slug: slugify(requestBody.title),
  });
  res.status(201).json({ data: product });
});

module.exports = {
  getProductsService,
  getProductService,
  createProductService,
  updateProductService,
  deleteProductService,
};
