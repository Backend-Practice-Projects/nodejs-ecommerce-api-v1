const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");

const factory = require("../services/handlers_factory");
const ApiError = require("../utils/api_error");

const {
  uploadSingleImageMiddleware,
} = require("../middlewares/upload_image_middleware");

const UserDoc = require("../models/user_model");

const uploadUserImageMiddleware = uploadSingleImageMiddleware("profileImg");

//Image processing
const resizeImageMiddleware = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const fileName = `user-${uuidv4()}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(400, 400)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/users/${fileName}`);
    req.body.profileImg = fileName;
  }

  next();
});

// @desc    Get list of users
// @route   GET /api/v1/users
// @access  Private
const getUsersService = factory.getAll(UserDoc);

// @desc    Get specific user by id
// @route   GET /api/v1/users/:id
// @access  Private
const getUserService = factory.getOne(UserDoc);

// @desc    Update specific user
// @route   PUT /api/v1/user/:id
// @access  Private
/*
 * password is stripped here so it can never be set unhashed through this
 * generic update path - password changes must go through
 * changeUserPasswordService instead.
 */
const updateUserService = asyncHandler((req, res, next) => {
  delete req.body.password;
  /*
   * factory.updateOne(UserDoc) is a factory call, not middleware itself - it
   * returns the actual asyncHandler(req, res, next) handler. Since this
   * wrapper already occupies the middleware slot, that returned handler has
   * to be invoked manually with (req, res, next) to actually run it.
   */
  return factory.updateOne(UserDoc)(req, res, next);
});

/*
 * findByIdAndUpdate bypasses Mongoose document middleware, so the pre("save")
 * hashing hook on the model never runs here - the password is hashed
 * explicitly before the update instead.
 */
// @desc    Change specific user's password
// @route   PUT /api/v1/users/changePassword/:id
// @access  Private
const changeUserPasswordService = asyncHandler(async (req, res, next) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 12);
  const document = await UserDoc.findByIdAndUpdate(
    req.params.id,
    { password: hashedPassword },
    { new: true },
  );
  if (!document) {
    return next(
      new ApiError(`No document found for this id ${req.params.id}`, 404),
    );
  }
  res.status(200).json({ data: document });
});

// @desc    Delete specific user
// @route   DELETE /api/v1/users/:id
// @access  Private
const deleteUserService = factory.deleteOne(UserDoc);

// @desc    Create user
// @route   POST  /api/v1/users
// @access  Private
const createUserService = factory.createOne(UserDoc);

module.exports = {
  getUsersService,
  getUserService,
  createUserService,
  updateUserService,
  changeUserPasswordService,
  deleteUserService,
  uploadUserImageMiddleware,
  resizeImageMiddleware,
};
