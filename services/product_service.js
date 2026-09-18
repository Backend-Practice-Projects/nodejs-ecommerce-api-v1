const ProductDoc = require("../models/product_model");
const factory = require("../services/handlers_factory");

// @desc    Get list of products
// @route   GET /api/v1/products
// @access  Public
const getProductsService = factory.getAll(ProductDoc, "Product");

// @desc    Get specific product by id
// @route   GET /api/v1/products/:id
// @access  Public
const getProductService = factory.getOne(ProductDoc);

// @desc    Update specific product
// @route   PUT /api/v1/products/:id
// @access  Private
const updateProductService = factory.updateOne(ProductDoc);

// @desc    Delete specific product
// @route   DELETE /api/v1/products/:id
// @access  Private
const deleteProductService = factory.deleteOne(ProductDoc);

// @desc    Create product
// @route   POST  /api/v1/products
// @access  Private
const createProductService = factory.createOne(ProductDoc);

module.exports = {
  getProductsService,
  getProductService,
  createProductService,
  updateProductService,
  deleteProductService,
};
