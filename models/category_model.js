const mongoose = require("mongoose");

//Check Autocomplete

//1. Create Schema

const categoriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      //Chaeck again didn't work
      required: [true, "Category is required"],
      unique: true,
      minlength: [3, "Category length must not be less than three character"],
      maxlength: [
        30,
        "Category length must not be greater than thirty character",
      ],
    },
    image: String,
    slug: {
      type: String,
      lowercase: true,
    },
  },
  {
    //Will add createdAt & UpdatedAt to the response
    timestamps: true,
  },
);

//2. Crete Model
const CategoriesDoc = mongoose.model("Category", categoriesSchema);

module.exports = CategoriesDoc;
