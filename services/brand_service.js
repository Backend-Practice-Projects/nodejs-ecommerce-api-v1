const BrandDoc = require("../models/brand_model");
const factory = require("../services/handlers_factory");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const {
  uploadSingleImageMiddleware,
} = require("../middlewares/upload_image_middleware");
const sharp = require("sharp");

const uploadBrandImageMiddleware = uploadSingleImageMiddleware("image");

//Image processing
const resizeImageMiddleware = asyncHandler(async (req, res, next) => {
  const fileName = `brand-${uuidv4()}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(400, 400)
    .toFormat("jpeg")
    .jpeg({ quality: 95 })
    //We should create the folder [brands] firstly
    .toFile(`uploads/brands/${fileName}`);
  req.body.image = fileName;
  //req.body.image = `${req.host}/${fileName}`;
  //Host return the hostname and port but host only return hostname

  next();
});

// @desc    Get list of brands
// @route   GET /api/v1/brands
// @access  Public
const getBrandsService = factory.getAll(BrandDoc);

// @desc    Get specific brand by id
// @route   GET /api/v1/brands/:id
// @access  Public
const getBrandService = factory.getOne(BrandDoc);

// @desc    Update specific brand
// @route   PUT /api/v1/brand/:id
// @access  Private

const updateBrandService = factory.updateOne(BrandDoc);

/**
 * You can remove the slug from the body and use this middleware and use before  the route in the router or apply the
 * slugify in the validator
 */

//Another STYLE

/* const applySlugify = (req, res, next) => {
  req.body.slug = slugify(req.body.name);
  next();
}; */

/* const updateBrandService = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;

  const brand = await BrandDoc.findOneAndUpdate(
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
}); */

// @desc    Delete specific brand
// @route   DELETE /api/v1/brands/:id
// @access  Private
const deleteBrandService = factory.deleteOne(BrandDoc);

// @desc    Create brand
// @route   POST  /api/v1/brands
// @access  Private
const createBrandService = factory.createOne(BrandDoc);

module.exports = {
  getBrandsService,
  getBrandService,
  createBrandService,
  updateBrandService,
  deleteBrandService,
  //applySlugify,
  uploadBrandImageMiddleware,
  resizeImageMiddleware,
};
