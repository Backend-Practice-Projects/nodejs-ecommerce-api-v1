const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    ratings: {
      type: Number,
      min: [1, "Min ratings value is 1.0"],
      max: [5, "Max ratings value is 5.0"],
      required: [true, "Review ratings required"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to user"],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "Review must belong to product"],
    },
  },
  { timestamps: true },
);

/*
 * One review per user per product.
 *
 * What an index is: a sorted lookup structure MongoDB keeps next to the
 * collection, like the index at the back of a book. Without one, a query scans
 * every document; with one, it jumps straight to the matches.
 *
 * When to use one:
 *   - on fields you filter or sort by often (speeds up reads)
 *   - with { unique: true } to make MongoDB reject duplicate values
 * The cost: every index takes storage and slows writes a little, since it must
 * be updated on each insert/update/delete. So index what you query, not everything.
 *
 * This one is a compound index (two fields together), 1 means ascending order.
 * unique applies to the pair: a user can review many products and a product can
 * have many reviews, but the same user + product combination can exist only once.
 *
 * createReviewValidator already checks this with findOne, same goal but a weaker
 * guarantee:
 *   - validator: returns a clean error message, but only covers that one route,
 *     and two simultaneous requests can both pass the check and create duplicates.
 *   - unique index: enforced by MongoDB itself, so duplicates are impossible from
 *     any code path, including concurrent requests. On violation it throws a raw
 *     E11000 duplicate key error instead of a friendly message.
 * Keep both: the validator for the readable error, the index as the real guarantee.
 *
 * Note: Mongoose creates indexes on startup (autoIndex) but never drops them.
 * If you remove or comment out this line, the index stays in the database and
 * keeps enforcing uniqueness (E11000 errors). Drop it manually:
 *   db.reviews.dropIndex("user_1_product_1")
 */
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

reviewSchema.pre(/^find/, function () {
  this.populate({ path: "user", select: "name" });
});

/*
 * Recalculate ratingsAverage and ratingsQuantity on the product from all of its reviews.
 *
 * Why a static: statics are attached to the model itself, not to a single
 * document, so `this` here is the Review model (which is why this.aggregate works).
 *   - schema.statics.foo -> Review.foo(), works on the whole collection
 *   - schema.methods.foo -> someReview.foo(), works on one document
 * The average needs all of a product's reviews, so it belongs on the model.
 */
reviewSchema.statics.calcAverageRatingsAndQuantity = async function (
  productId,
) {
  /*
   * aggregate runs a pipeline inside MongoDB: each stage's output feeds the next.
   * It is for computing values (averages, counts) instead of just fetching documents.
   *   - $match filters like find(): keeps only this product's reviews.
   *   - $group collapses them into one result per _id and computes fields over
   *     the group. Only one product is left after $match, so we get one result.
   *   - $avg: "$ratings" averages the ratings field.
   *   - $sum: 1 adds the constant 1 per document, which is a count
   *     ($sum: "$ratings" would total the ratings instead).
   *
   * Reviews rated 5, 4, 3 give [{ _id: productId, ratingsAverage: 4, ratingsQuantity: 3 }].
   * No reviews means $match passes nothing and the result is [], hence the else below.
   */
  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        ratingsAverage: { $avg: "$ratings" },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  /*
   * Looked up lazily to avoid a circular import.
   *
   * A circular import is two files requiring each other (review_model ->
   * product_model -> review_model). Node can't finish loading either first, so
   * one gets a half-loaded {} export and calls like findByIdAndUpdate fail.
   *
   * "Lazily" means the model is fetched when this function runs, not at file
   * load. mongoose.model("Product") with one argument imports nothing: it looks
   * the model up by name in Mongoose's registry, so this file never requires
   * product_model at all.
   *
   * No cycle exists today (product_model refers to Review by name only), so this
   * is a guard in case that changes. The Product model must already be
   * registered when this runs, otherwise Mongoose throws MissingSchemaError.
   */
  const ProductDoc = mongoose.model("Product");
  if (result.length > 0) {
    await ProductDoc.findByIdAndUpdate(productId, {
      ratingsAverage: result[0].ratingsAverage,
      ratingsQuantity: result[0].ratingsQuantity,
    });
  } else {
    await ProductDoc.findByIdAndUpdate(productId, {
      ratingsAverage: 0,
      ratingsQuantity: 0,
    });
  }
};

/*
 * save() covers create; the findOneAnd* hooks cover findByIdAndUpdate/findByIdAndDelete
 * used by the factory.
 *
 * Why doc.constructor: the static lives on the model, but the hooks only hand us
 * a document. doc.constructor is the model that created it (Review), so it is the
 * way back from the document to the model. Review itself can't be referenced here
 * because it isn't defined until mongoose.model() at the bottom of the file, and
 * in the findOneAnd* hook `this` is the query, not a document.
 *
 * `this` is not always the model: it is whatever the function was called on.
 *   - schema.statics            -> the model    (Review.foo())
 *   - schema.methods            -> the document (review.foo())
 *   - document hooks (save, validate)                     -> the document
 *   - query hooks (find*, findOneAnd*, update*, delete*)  -> the query
 * How to tell: look at the hook name. If it is a method you call on a document
 * (doc.save()), `this` is the document. If it is a method you call on the model
 * to build a query (Review.findByIdAndUpdate()), `this` is the query, because no
 * document is loaded in memory when the hook starts; the found one arrives as `doc`.
 */
reviewSchema.post("save", async function (doc) {
  await doc.constructor.calcAverageRatingsAndQuantity(doc.product);
});

/*
 * Only this hook guards with if (doc). save() runs on a document that already
 * exists in memory, so doc is always there. Here doc is whatever the query found:
 * if the id matches no review, findByIdAndUpdate/findByIdAndDelete resolve to null
 * and the hook still runs. Without the guard, null.constructor would throw a
 * TypeError and the client would get a 500 instead of the factory's 404.
 */
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcAverageRatingsAndQuantity(doc.product);
});

module.exports = mongoose.model("Review", reviewSchema);
