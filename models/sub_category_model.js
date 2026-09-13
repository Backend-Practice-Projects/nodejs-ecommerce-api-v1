const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    //Required ??
    name: {
      type: String,
      trim: true,
      unique: true,
      minlength: [2, "Sub Category length must not be less than two character"],
      maxlength: [
        32,
        "Sub Category length must not be greater than thirty two characters",
      ],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    //Reference to a parent Category document (like forigen key in SQL)
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Sub Category must be belong to parent category"],
    },
  },
  { timestamps: true },
);
const SubCategoryDoc = mongoose.model("SubCategory", subCategorySchema);

module.exports = SubCategoryDoc;
