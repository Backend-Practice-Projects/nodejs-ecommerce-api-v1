/**
 * [1] Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
 * NOTE: Multer will not process any form which is not multipart (multipart/form-data).
 * [2] You also can upload files directly to Amazon Simple Storage Service (S3)
 * [3] Also you can use Cloudinary image uploader
 */
const multer = require("multer");
const ApiError = require("../utils/api_error");

/*
 * FULL UPLOAD FLOW (client -> Multer -> req.file):
 *
 * 1. Client sends a `multipart/form-data` request. The image is placed in the
 *    request body as raw BINARY bytes (not text), wrapped between boundary
 *    markers, e.g.:
 *
 *      ------WebKitFormBoundaryABC123
 *      Content-Disposition: form-data; name="image"; filename="photo.jpg"
 *      Content-Type: image/jpeg
 *
 *      <raw binary bytes of the image>
 *      ------WebKitFormBoundaryABC123--
 *
 * 2. The "raw binary bytes" are just a sequence of numeric byte values
 *    (0x00-0xFF each), not readable characters. Example of the actual first
 *    bytes of a real JPEG file (shown in hex):
 *
 *      ffd8 ffdb 0043 0002 0101 0101 0102 0101
 *      0102 0202 0202 0403 0202 0202 0504 0403
 *
 *    Meaning:
 *      - `FF D8` -> JPEG "Start of Image" marker. Every JPEG file begins
 *        with these two bytes, which is how formats are identified from
 *        content alone (this is called a "magic number").
 *      - `FF DB` -> "Define Quantization Table" marker, part of JPEG's
 *        internal compression metadata.
 *      - The rest are compressed image data, not text, so they can't be
 *        opened/read as a string.
 *
 * 3. Express alone cannot parse multipart bodies. Multer reads the
 *    incoming stream, finds the file part, and (with memoryStorage, as
 *    configured below) buffers those binary bytes into `file.buffer`.
 *
 * 4. Multer populates `req.file` with metadata about the upload, including
 *    `mimetype`. The mimetype is reported by the CLIENT based on the file's
 *    content/extension, not verified by Multer. Note: `.jpg` and `.jpeg`
 *    extensions both map to the SAME mimetype, `image/jpeg` - there is no
 *    separate `image/jpg` MIME type in the standard, so a file named
 *    "photo.jpg" still reports `mimetype: "image/jpeg"`.
 *
 * 5. The controller/handler after this middleware can then read
 *    `req.file.buffer` (e.g. to resize with sharp and save to disk).
 */

const multerOptions = () => {
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
  return upload;
};

exports.uploadSingleImageMiddleware = (fieldName) =>
  multerOptions().single(fieldName);

/*
 * upload.fields() vs upload.array():
 * - upload.fields([{ name, maxCount }, ...]) is for multiple DIFFERENT form fields
 *   (e.g. "imageCover" and "images" here), each parsed into req.files[fieldName].
 *   Use it when the fields represent different things and need to be handled separately.
 * - upload.array(fieldName, maxCount) is for a SINGLE form field that holds multiple files
 *   of the same kind (e.g. just "images"), parsed into req.files as one flat array.
 *   Use it when all uploaded files belong to one field and are treated the same way.
 */
exports.uploadMixOfImagesMiddleware = (arrayOfImageFields) =>
  multerOptions().fields(arrayOfImageFields);
