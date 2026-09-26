const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const sharp = require("sharp");

const factory = require("../services/handlers_factory");

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

const updateUserService = factory.updateOne(UserDoc);

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
  deleteUserService,
  uploadUserImageMiddleware,
  resizeImageMiddleware,
};
