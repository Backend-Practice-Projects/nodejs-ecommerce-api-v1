/**
 * Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
 * NOTE: Multer will not process any form which is not multipart (multipart/form-data).
 */
const multer = require("multer");
const ApiError = require("../utils/api_error");

exports.uploadSingleImageMiddleware = (fieldName) => {
  //const upload = multer({ dest: "uploads/categories" });
  /**
   * We have to types of storage, DiskStorage: The disk storage engine gives you full control on storing files to disk.
   * MemoryStorage: The memory storage engine stores the files in memory as Buffer objects. It doesn't have any options.
   */
  /* const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/categories");
  },
  filename: function (req, file, cb) {
    //You can use the originalname instead of mimetype and split by (.)
    const ext = file.mimetype.split("/")[1];
    const fileName = `category-${uuidv4()}-${Date.now()}.${ext}`;
    cb(null, fileName);
  },
}); */

  const storage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else cb(new ApiError("Images are only allowed", 400), false);
  };
  const upload = multer({ storage: storage, fileFilter: multerFilter });

  return upload.single(fieldName);
};
