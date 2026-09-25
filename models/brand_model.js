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

const setImageURL = (doc) => {
  if (doc.image) {
    const imageURL = `${process.env.BASE_URL}/brands/${doc.image}`;
    doc.image = imageURL;
  }
};

brandSchema.post("init", function (doc) {
  setImageURL(doc);
});
brandSchema.post("save", function (doc) {
  setImageURL(doc);
});

const BrandDoc = mongoose.model("Brand", brandSchema);

module.exports = BrandDoc;
