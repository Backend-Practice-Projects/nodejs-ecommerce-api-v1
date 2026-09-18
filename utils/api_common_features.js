class ApiCommonFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }
  filter() {
    // Clone queryString before deleting keys - this.queryString is the same
    // object reference as req.query, so deleting keys directly on it would
    // strip page/limit/sort/fields/keyword from req.query itself, and the
    // methods that run after filter() (search, fieldsLimiting, sort) in the same request lifecycl would
    // then find those keys already gone.
    const queryString = { ...this.queryString };
    const excludeFields = ["page", "limit", "sort", "fields", "keyword"];
    excludeFields.forEach((field) => delete queryString[field]);
    //Filtering Using [gte,gt,lte,lt]
    /**
     * In Postman, you write it as part of the query parameter value your API expects
     * (Postman itself doesn't have special syntax) — commonly: ?field[gte]=value or ?field=>=value
     * The exact format depends on your backend's filtering convention
     */
    /**
     * With the "extended" query parser, ?price[gte]=100 becomes
     * { price: { gte: '100' } }. Mongoose expects Mongo operators prefixed
     * with "$" (e.g. { price: { $gte: 100 } }), so we stringify the object
     * and prefix each operator keyword with "$" before parsing it back.
     * Regex breakdown: /\b(gte|gt|lte|lt)\b/g
     *   \b          - word boundary: ensures we match "gte" as a whole word,
     *                 not as part of another word (e.g. won't match inside
     *                 "rating" or "budget")
     *   (gte|gt|lte|lt) - capture group with alternation: matches exactly one
     *                 of these 4 literal words
     *   \b          - closing word boundary, same purpose as the first
     *   g           - global flag: replace ALL matches in the string, not
     *                 just the first one (so both "gte" and "gt" in
     *                 different fields get converted)
     * Since JSON.stringify wraps keys in quotes (e.g. "gte":"100"), the \b
     * boundaries land right at the quote characters, so this only matches
     * the operator keywords used as object keys - not inside field names
     * or values.
     */
    let queryStr = JSON.stringify(queryString);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const filterObject = JSON.parse(queryStr);
    //Using Mongo DB (1)
    this.mongooseQuery = this.mongooseQuery.find(filterObject);
    //Using Mongo DB (2)
    /*  this.mongooseQuery = this.mongooseQuery.find({
        price: req.query.price,
        ratingsAverage: req.query.ratingsAverage,
      })
        .skip(skip)
        .limit(limit)
        .populate({ path: "category", select: "name-_id" }); */

    //Using Mongoose ODM
    /*   this.mongooseQuery = this.mongooseQuery.find()
        .skip(skip)
        .limit(limit)
        .populate({ path: "category", select: "name-_id" })
        .where("price")
        .equals(req.query.price)
        .where("ratingsAverage")
        .equals(req.query.ratingsAverage); */
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      //By default it is ascending if we need to make it decending add - before the field we want to sort
      //When sorting if we found two fields were equal we show the first added one then the other
      //mongooseQuery = mongooseQuery.sort(req.query.sort);
      //mongooseQuery = mongooseQuery.sort("price");

      //If we want to sort be more than one field we use in postman eg. sort=price,sold. So we need to handle that
      const sortBy = this.queryString.sort.split(",").join(" ");

      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
      // If sort=price,sold looks like it only sorted by price, your test data likely
      // doesn't have varying sold values for products that share the same price, so
      // sorting by sold as tiebreaker isn't visibly changing anything — it looks like
      // "only price" sorted because price already fully determines the order for your
      // dataset. To verify, check: are there two or more products with the same price
      // but different sold values in your data? If not, the secondary sort key will
      // never show a visible effect, even though it's working correctly.
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  fieldsLimiting() {
    if (this.queryString.fields) {
      const selectedFields = this.queryString.fields.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(selectedFields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select("-__v");
    }
    return this;
  }

  search() {
    if (this.queryString.keyword) {
      /**
       * How this operator combo works:
       * 1. $regex builds a pattern-matching condition instead of an exact-value
       *    match, so { title: { $regex: "men" } } matches any title that
       *    CONTAINS "men" anywhere in the string (e.g. "Women's Shirt"),
       *    not just documents whose title is exactly "men".
       * 2. $options: "i" is a modifier for $regex specifically - "i" tells
       *    Mongo to ignore case, so "MEN", "Men", and "men" all match.
       * 3. $or takes an array of condition objects and matches a document if
       *    ANY ONE of them is true, unlike a plain object where every key
       *    must match. So this returns products where the keyword is found
       *    in the title OR the description (a product doesn't need both).
       */
      const searchQuery = {};
      // Escape regex special chars so user input can't inject patterns
      // (regex-injection / ReDoS via e.g. keyword=.* or keyword=(a+)+$)
      const escapedKeyword = this.queryString.keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      searchQuery.$or = [
        { title: { $regex: escapedKeyword, $options: "i" } },
        { description: { $regex: escapedKeyword, $options: "i" } },
      ];

      this.mongooseQuery = this.mongooseQuery.find(searchQuery);
    }
    return this;
  }

  paginate(documentsCount) {
    // Edge case: clamp page to >= 1 so page=0/negative can't produce a
    // negative skip.
    const page = Math.max(this.queryString.page * 1 || 1, 1);
    // Edge case: clamp limit to [1, 100] - limit=0 would mean "no limit" in
    // Mongoose (returns everything) and division by zero below; an
    // unbounded limit (e.g. limit=1000000) would let a client force a
    // full-collection fetch in one request - a DoS/performance risk.
    const limit = Math.min(Math.max(this.queryString.limit * 1 || 5, 1), 100);
    const skip = (page - 1) * limit;
    const pagination = {};
    pagination.currentPage = page;
    //Ceil: Returns the smallest integer greater than or equal to its numeric argument.
    pagination.numberOfPages = Math.ceil(documentsCount / limit);

    pagination.limit = limit;
    const pageLastIndex = page * limit;
    if (pageLastIndex < documentsCount) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.previous = page - 1;
    }
    // Edge case: page beyond the last page still runs a query (empty
    // result) with no signal to the client that the page itself doesn't
    // exist - expose it so callers can 404 instead of returning [].
    pagination.isOutOfRange = page > pagination.numberOfPages;
    this.meta = pagination;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    return this;
  }
}
module.exports = ApiCommonFeatures;
