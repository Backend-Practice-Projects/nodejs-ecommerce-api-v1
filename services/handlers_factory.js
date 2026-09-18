const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/api_error");
const ApiCommonFeatures = require("../utils/api_common_features");

exports.deleteOne = (docModel) =>
  asyncHandler(async (req, res, next) => {
    const id = req.params.id;

    const document = await docModel.findByIdAndDelete(id);
    if (!document) {
      return next(new ApiError(`No document found for this id ${id}`, 404));
    }
    res.status(204).send();
  });

exports.updateOne = (docModel) =>
  asyncHandler(async (req, res, next) => {
    const document = await docModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!document) {
      return next(
        new ApiError(`No document found for this id ${req.params.id}`, 404),
      );
    }
    res.status(200).json({
      data: document,
    });
  });

exports.createOne = (docModel) =>
  asyncHandler(async (req, res) => {
    /**
     * The Mongoose schema-level validators (max, min, maxlength, etc.) don't run until
     * you call .save()/.create(), which happens after your Express-validator
     * middleware chain already passed the request through.
     */
    const newDocument = await docModel.create(req.body);
    res.status(201).json({ data: newDocument });
  });

exports.getOne = (docModel) =>
  asyncHandler(async (req, res, next) => {
    const document = await docModel.findById(req.params.id);
    if (!document) {
      /*     return res
      .status(404)
      .json({ message: `No category found for this id ${id}` }); */
      return next(
        new ApiError(`No document found for this id ${req.params.id}`, 404),
      );
    }
    res.status(200).json({
      data: document,
    });
  });

exports.getAll = (docModel, modelName = "") =>
  asyncHandler(async (req, res, next) => {
    console.log(req.params);

    let filterObject = {};
    if (req.filterObject) {
      filterObject = req.filterObject;
    }
    const documentsCount = await docModel.countDocuments();
    //Build Query
    const apiCommonFeatures = new ApiCommonFeatures(
      docModel.find(filterObject),
      req.query,
    )
      .paginate(documentsCount)
      .filter()
      .search(modelName)
      .fieldsLimiting()
      .sort();

    const meta = apiCommonFeatures.meta;
    // Edge case: requested page is beyond the last page (e.g. page=100 when
    // only 3 exist) - without this check we'd silently return an empty array
    // instead of telling the client the page doesn't exist.

    if (meta.isOutOfRange) {
      return next(
        new ApiError(
          `Page ${meta.currentPage} does not exist, maximum page is ${meta.numberOfPages}`,
          404,
        ),
      );
    }

    // Edge case: if you need to populate must run on the raw mongooseQuery, not chained on
    // ApiCommonFeatures - the class has no populate() method, so chaining it
    // there throws "populate is not a function".
    const documents = await apiCommonFeatures.mongooseQuery;

    res.status(200).json({
      result: documents.length,
      meta,
      data: documents,
    });
  });
