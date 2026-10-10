const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Too short product title"],
      maxlength: [100, "Too long product title"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      minlength: [20, "Too short product description"],
    },
    quantity: {
      type: Number,
      required: [true, "Product quantity is required"],
    },
    sold: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      trim: true,
      max: [200000, "Too long product price"],
    },
    priceAfterDiscount: {
      type: Number,
    },
    /*
     * Mongoose uses simplified JavaScript object notation for defining schemas.
     * colors: [String] "array of string" is Mongoose syntax, not plain JavaScript.
     */
    colors: [String],
    imageCover: {
      type: String,
      required: [true, "Product Image cover is required"],
    },
    images: [String],
    /*
     * mongoose.Schema.ObjectId is an alias of mongoose.Schema.Types.ObjectId
     * (the documented form), kept for backwards compatibility. Both behave
     * identically.
     */
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Product must belongs to category"],
    },
    subcategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "SubCategory",
      },
    ],
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "Brand",
    },
    ratingsAverage: {
      type: Number,
      min: [1, "Rating must be above or equal 1.0"],
      max: [5, "Rating must be below or equal 5.0"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    /*
     * toJSON: applies when the document is serialized with JSON.stringify or
     * res.json(). Virtuals are skipped by default, so without this the
     * reviews field would never reach the API response.
     * Side effect: Mongoose's built-in id virtual (string copy of _id) is
     * included too, so responses carry both _id and id. It is harmless but
     * redundant; add id: false to these schema options to drop it.
     */
    toJSON: { virtuals: true },
    /*
     * toObject: applies when doc.toObject() is called (or the doc is logged).
     * Keeps both representations consistent.
     */
    toObject: { virtuals: true },
  },
);

/*
 * Virtual populate: exposes the product's reviews without storing review ids
 * on the product document. Only filled when .populate("reviews") is called.
 *
 * How it works: the virtual is not stored in MongoDB. On populate, Mongoose
 * runs Review.find({ product: <this product's _id> }) and attaches the result.
 *   ref          - the model to query (Review)
 *   foreignField - the field in the Review model that points back (product)
 *   localField   - the field in this model it is compared against (_id)
 *
 * When to use it: for a one-to-many relation where the "many" side (reviews)
 * already holds the reference to the "one" side (product), and the list can
 * grow without limit. Storing an array of review ids on the product would
 * duplicate the relation, risk going out of sync, and bloat the document (a known MongoDB anti-pattern).
 * Use a normal stored ref array instead when the list is small and bounded
 * (e.g. subcategories).
 *
 * Caveats: virtuals can't be queried or selected (no .select("reviews") or
 * filter on it), and the reviews are only included where populate is
 * requested (here, get-one product), not on every read.
 */
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

/*
 * pre is Mongoose middleware that runs before the matched query executes.
 * /^find/ matches find, findOne, findOneAndUpdate, etc. so category is
 * populated on every read variant, not just find().
 * Must be registered before mongoose.model() compiles the schema below -
 * hooks added after compilation don't attach.
 *
 * Side effect: the hook also fires when products are loaded through another
 * model's populate, because populate runs a Product.find() under the hood.
 * Example: the wishlist endpoint calls
 *   User.findById(id).populate({ path: "wishlist", select: "title" })
 * and each product still comes back as { _id, title, category, id }:
 *   category - this hook populates it, and populating a path forces that
 *              field back into the projection even though the caller's
 *              select left it out.
 *   id       - Mongoose's built-in virtual, included because of
 *              toJSON: { virtuals: true } in the schema options above.
 *   _id      - always returned unless excluded explicitly.
 *
 * How to get only the selected fields:
 *   _id      - exclude it in the caller's select: "title -_id".
 *   category - skip the populate for that query, e.g. pass
 *              options: { skipCategory: true } in the caller's populate and
 *              check this.getOptions().skipCategory here before populating.
 *   id       - set id: false in the schema options; this removes it from
 *              every product response, not just the wishlist.
 */

productSchema.pre(/^find/, function () {
  // In query middleware functions, this refers to the query (find).
  // if (this.getOptions().skipCategory) return;
  this.populate({ path: "category", select: "name" });
});

const setImageURL = (doc) => {
  if (doc.imageCover) {
    const imageURL = `${process.env.BASE_URL}/products/${doc.imageCover}`;
    doc.imageCover = imageURL;
  }
  if (doc.images) {
    const imageList = [];
    doc.images.forEach((image) => {
      const imageURL = `${process.env.BASE_URL}/products/${image}`;
      imageList.push(imageURL);
    });
    doc.images = imageList;
  }
};

productSchema.post("init", function (doc) {
  setImageURL(doc);
});
productSchema.post("save", function (doc) {
  setImageURL(doc);
});

// In Mongoose, a document is an instance of a Model class.
const ProductDoc = mongoose.model("Product", productSchema);

module.exports = ProductDoc;
