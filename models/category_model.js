const mongoose = require("mongoose");

//Check Autocomplete

//1. Create Schema

//If i added any field in the body from the client that wasn't defined here it will be ignored
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

const setImageURL = (doc) => {
  if (doc.image) {
    const imageURL = `${process.env.BASE_URL}/categories/${doc.image}`;
    // Only mutate the in-memory doc.image for the response, don't persist
    // the full URL back to the DB, since BASE_URL differs per environment
    // (dev/staging/production) and only the filename should be stored.
    doc.image = imageURL;
  }
};

// Convert the stored image filename into a full URL whenever a document
// is loaded from the DB ("init") or persisted ("save"), so API responses
// always return a usable image URL instead of just the filename.
// - "init": fires after a document is hydrated from a query result
//   (find/findOne/findById, etc.), i.e. whenever an existing doc is read.
// - "save": fires after a document is saved via .save() or created via
//   .create() (which calls .save() internally), i.e. whenever a doc is
//   created or updated using the document API. It does NOT fire on
//   query-based writes like findByIdAndUpdate/updateOne.
categoriesSchema.post("init", function (doc) {
  setImageURL(doc);
});
categoriesSchema.post("save", function (doc) {
  setImageURL(doc);
});

//2. Crete Model
const CategoriesDoc = mongoose.model("Category", categoriesSchema);

module.exports = CategoriesDoc;
