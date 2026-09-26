//ES6 Style
//import express, { Request, Response } from "express";
//CommonJs Style
/**
 * Arrange the imports to be as follow: Core Modules, Third Parties Modules, App Modules
 */
const path = require("path");

const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");

const dbConfiguration = require("./configs/database_config");
const categoryRoute = require("./routes/category_route");
const brandRoute = require("./routes/brand_route");
const subCategoryRoute = require("./routes/sub_category_route");
const productRoute = require("./routes/product_route");
const userRoute = require("./routes/user_route");

const ApiError = require("./utils/api_error");
const globalErrorMiddleware = require("./middlewares/global_error_middleware");

/**
 * Load variables from .env, If the config file was declared as .env
 * only we do not need to declare path
 */
dotenv.config({ path: "config.env" });

//Connect with DB
dbConfiguration();

const app = express();
/**
 * Express 5 changed the default query parser from "extended" (the qs library)
 * to "simple" (Node's built-in querystring), which does NOT understand bracket
 * notation. That means a request like ?price[gte]=100 was being parsed as a
 * flat key literally named "price[gte]" instead of a nested object
 * { price: { gte: '100' } }.
 *
 * Our filtering logic (see product_service.js) relies on that nested shape to
 * convert gte/gt/lte/lt into MongoDB's $gte/$gt/$lte/$lt operators, so we
 * restore Express 4's "extended" parser here to get bracket-notation nesting
 * back.
 *
 * This isn't the only fix — we could instead manually parse bracket syntax
 * in product_service.js (e.g. regex on req.url) and leave the parser as
 * "simple". But "extended" is the standard, low-risk option: it only changes
 * how req.query is built (nested/bracket params like ?a[b]=1 become objects,
 * and array syntax ?a[]=1&a[]=2 works again). It shouldn't affect other
 * routes here since pagination, sort, and fields are all flat params.
 */
app.set("query parser", "extended");

//MiddlewareS

/**
 * JSON Decoding Middleware. Also you can use body-parser npm package
 */
app.use(express.json());
/**
 * Serve Static Files
 * express.static exposes a folder's files directly over HTTP (no custom route needed),
 * so e.g. a file at uploads/categories/foo.jpeg becomes reachable at /categories/foo.jpeg.
 * Without this middleware, requests for those files would hit no matching route
 * and fall through to the 404 handler ("Can't find this route ...").
 *
 * __dirname is the absolute path of the folder that contains this file (app.js).
 * Example: if this project lives at /Users/you/project, then __dirname is
 * "/Users/you/project", so path.join(__dirname, "uploads") resolves to
 * "/Users/you/project/uploads" no matter where you run `node app.js` from
 * (e.g. running it from your home folder wouldn't break the path, unlike
 * a relative path like "./uploads" would).
 */
app.use(express.static(path.join(__dirname, "uploads")));

//Logging Middleware
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
  console.log(`Node environment: ${process.env.NODE_ENV}`);
}

//Mount  Routes
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/brands", brandRoute);
app.use("/api/v1/subcategories", subCategoryRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/users", userRoute);

//This Route Used to Handle Unhandled Routes and Send Error to Error Handling Middleware
app.all("*splat", (req, res, next) => {
  //const error = new Error(`Can't find this route ${req.originalUrl}`);
  const error = new ApiError(`Can't find this route ${req.originalUrl}`, 400);
  //Path to the next middleware
  next(error);
});
/**
 * Global Error Handling Middleware For Express
 * Must be mounted AFTER the routes, and must take four arguments,
 * that is how express recognizes it as an error handler
 */
app.use(globalErrorMiddleware);
// app.use((error, req, res, next) => {
//   //Duplicate key, `unique` is an index not a validator so it has no message
//   if (error.code === 11000) {
//     const field = Object.keys(error.keyValue || {})[0];
//     return res.status(400).json({
//       status: "fail",
//       message: `${field} must be unique, this value already exists`,
//     });
//   }

//   //Schema validators, like required, minlength & maxlength
//   if (error.name === "ValidationError") {
//     return res.status(400).json({
//       status: "fail",
//       message: Object.values(error.errors).map((one) => one.message),
//     });
//   }

//   res.status(error.statusCode || 500).json({
//     status: "error",
//     message: error.message,
//   });
// });

module.exports = app;
