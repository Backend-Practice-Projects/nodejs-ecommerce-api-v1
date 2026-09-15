const ProductDoc = require("../models/product_model");
const slugify = require("slugify");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");

// @desc    Get list of products
// @route   GET /api/v1/products
// @access  Public

const getProductsService = asyncHandler(async (req, res) => {
  //Filtering
  const queryStringObject = req.query;
  const excludeFields = ["page", "limit", "sort", "fields"];
  excludeFields.forEach((field) => delete queryStringObject[field]);
  //Filtering Using [gte,gt,lte,lt]
  /**
   * In Postman, you write it as part of the query parameter value your API expects
   * (Postman itself doesn't have special syntax) — commonly: ?field[gte]=value or ?field=>=value
   * The exact format depends on your backend's filtering convention
   */
  /**
   * With the "extended" query parser, ?price[gte]=100 becomes
   * { price: { gte: '100' } }. Mongoose expects Mongo operators prefixed
   * with "$" (e.g. { price: { $gte: 100 } }), so we stringify the object
   * and prefix each operator keyword with "$" before parsing it back.
   * Regex breakdown: /\b(gte|gt|lte|lt)\b/g
   *   \b          - word boundary: ensures we match "gte" as a whole word,
   *                 not as part of another word (e.g. won't match inside
   *                 "rating" or "budget")
   *   (gte|gt|lte|lt) - capture group with alternation: matches exactly one
   *                 of these 4 literal words
   *   \b          - closing word boundary, same purpose as the first
   *   g           - global flag: replace ALL matches in the string, not
   *                 just the first one (so both "gte" and "gt" in
   *                 different fields get converted)
   * Since JSON.stringify wraps keys in quotes (e.g. "gte":"100"), the \b
   * boundaries land right at the quote characters, so this only matches
   * the operator keywords used as object keys - not inside field names
   * or values.
   */
  let queryStr = JSON.stringify(queryStringObject);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  const filterObject = JSON.parse(queryStr);

  //Pagination and Populations
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;

  //Build Query
  const mongooseQuery = ProductDoc.find(filterObject)
    .skip(skip)
    .limit(limit)
    .populate({ path: "category", select: "name-_id" });

  //Execute Query
  const products = await mongooseQuery;

  //Using Mongo DB (2)
  /*     const products = await ProductDoc.find({
    price: req.query.price,
    ratingsAverage: req.query.ratingsAverage,
  })
    .skip(skip)
    .limit(limit)
    .populate({ path: "category", select: "name-_id" }); */

  //Using Mongoose ODM
  /*       const products = await ProductDoc.find()
    .skip(skip)
    .limit(limit)
    .populate({ path: "category", select: "name-_id" })
    .where("price")
    .equals(req.query.price)
    .where("ratingsAverage")
    .equals(req.query.ratingsAverage); */

  //Sending The API Response
  res.status(200).json({
    meta: {
      result: products.length,
      page: page,
      limit: limit,
    },
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
