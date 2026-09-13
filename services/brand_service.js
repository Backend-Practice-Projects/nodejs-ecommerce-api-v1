const BrandDoc = require("../models/brand_model");
const slugify = require("slugify");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");

// @desc    Get list of brands
// @route   GET /api/v1/brands
// @access  Public
const getBrandsService = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;
  const brands = await BrandDoc.find().skip(skip).limit(limit);
  res.status(200).json({
    meta: {
      result: brands.length,
      page: page,
      limit: limit,
    },
    data: brands,
  });
});

// @desc    Get specific brand by id
// @route   GET /api/v1/brands/:id
// @access  Public
const getBrandService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const brand = await BrandDoc.findById(id);
  if (!brand) {
    return next(new ApiError(`No brand found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: brand,
  });
});

// @desc    Update specific brand
// @route   PUT /api/v1/brand/:id
// @access  Private
const updateBrandService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;

  const brand = await BrandDoc.findByIdAndUpdate(
    { _id: id },
    { name: name, slug: slugify(name) },
    { new: true },
  );
  if (!brand) {
    return next(new ApiError(`No brand found for this id ${id}`, 404));
  }
  res.status(200).json({
    data: brand,
  });
});

// @desc    Delete specific brand
// @route   DELETE /api/v1/brands/:id
// @access  Private
const deleteBrandService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const brand = await BrandDoc.findByIdAndDelete(id);
  if (!brand) {
    return next(new ApiError(`No brand found for this id ${id}`, 404));
  }
  res.status(204).send();
});

// @desc    Create brand
// @route   POST  /api/v1/brands
// @access  Private
const createBrandService = asyncHandler(async (req, res) => {
  const brandName = req.body.name;

  const brand = await BrandDoc.create({
    name: brandName,
    slug: slugify(brandName),
  });
  res.status(201).json({ data: brand });
});

module.exports = {
  getBrandsService,
  getBrandService,
  createBrandService,
  updateBrandService,
  deleteBrandService,
};
