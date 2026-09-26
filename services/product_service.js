const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

const ProductDoc = require("../models/product_model");
const factory = require("../services/handlers_factory");
const {
  uploadMixOfImagesMiddleware,
} = require("../middlewares/upload_image_middleware");

const uploadProductImages = uploadMixOfImagesMiddleware([
  {
    name: "imageCover",
    maxCount: 1,
  },
  {
    name: "images",
    maxCount: 5,
  },
]);

//Image Processing
const resizeImageMiddleware = asyncHandler(async (req, res, next) => {
  //[1] Image Processing For Image Cover
  if (req.files.imageCover) {
    const imageCoverFileName = `brand-${uuidv4()}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/products/${imageCoverFileName}`);
    req.body.imageCover = imageCoverFileName;
  }
  //[1] Image Processing For Images

  if (req.files.images) {
    req.body.images = [];
    /*
     * Use Promise.all when you need to run several independent async
     * operations (here: resizing each uploaded image) concurrently and
     * wait for all of them to finish before moving on. It's faster than
     * awaiting each image one by one in a loop, but if any promise rejects,
     * Promise.all rejects immediately, so only use it when it's fine to
     * fail the whole batch if a single item fails.
     *
     * Without Promise.all (e.g. just calling map with async and not awaiting
     * the result), the map callback would kick off each image's async work
     * but return immediately with an array of pending Promises, not the
     * resolved data. Execution would move on to `next()` before any image
     * finished resizing, so req.body.images would still be empty (or only
     * partially filled) when the next middleware/controller runs.
     */
    await Promise.all(
      req.files.images.map(async (image, index) => {
        const imageName = `brand-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;

        await sharp(image.buffer)
          .resize(400, 400)
          .toFormat("jpeg")
          .jpeg({ quality: 95 })
          .toFile(`uploads/products/${imageName}`);
        req.body.images.push(imageName);
      }),
    );
  }

  next();
});

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
  uploadProductImages,
  resizeImageMiddleware,
};
