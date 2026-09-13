//ES6 Style
//import express, { Request, Response } from "express";
//CommonJs Style
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const dbConfiguration = require("./configs/database_config");
const categoryRoute = require("./routes/category_route");
const brandRoute = require("./routes/brand_route");
const subCategoryRoute = require("./routes/sub_category_route");
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

//MiddlewareS

/**
 * JSON Decoding Middleware. Also you can use body-parser npm package
 */
app.use(express.json());

//Logging Middleware
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
  console.log(`Node environment: ${process.env.NODE_ENV}`);
}

//Mount  Routes
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/brands", brandRoute);
app.use("/api/v1/subcategories", subCategoryRoute);

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
