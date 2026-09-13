const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand is required"],
      unique: true,
      minlength: [3, "Brand length must not be less than three character"],
      maxlength: [30, "Brand length must not be greater than thirty character"],
    },
    image: String,
    slug: {
      type: String,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

const BrandDoc = mongoose.model("Brand", brandSchema);

module.exports = BrandDoc;
