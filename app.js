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
const cors = require("cors");
const compression = require("compression");

const dbConfiguration = require("./configs/database_config");
/**
 * When require() is given a folder, Node automatically looks for index.js inside it,
 * so require("./routes") and require("./routes/index.js") load the same file.
 *
 * `index` is the fixed name for that shortcut. You can rename the file to anything,
 * but then you must write the filename in the import, e.g.
 * require("./routes/mount_routes"). The .js extension stays optional either way.
 *
 * The one exception is a package.json inside the folder with a "main" field pointing
 * to another file, which is rarely worth doing for an app folder.
 */
const mountRoutes = require("./routes");
const { webhookCheckoutService } = require("./services/order_service");

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
/*
 * CORS (Cross-Origin Resource Sharing): It is a Node.js middleware for Express and Connect
 * that sets Cross-Origin Resource Sharing (CORS) response headers.
 *
 * What: browsers block a page served from one origin (e.g. http://localhost:3000)
 * from reading responses of another origin (e.g. this API on http://localhost:8000).
 * An origin is scheme + host + port, so a different port already counts as
 * different. The scheme is the protocol at the start of a URL (http or https),
 * so http://localhost:8000 and https://localhost:8000 are different origins. This is the browser's "same-origin policy".
 *
 * Use: the server opts in by sending an Access-Control-Allow-Origin response
 * header. cors() adds it to every response (value "*" means any origin may
 * read it), and also answers the browser's OPTIONS preflight requests that
 * come before non-simple requests (e.g. JSON body or an Authorization header).
 * Preflight means that before sending such a request, the browser first asks
 * the server with an OPTIONS request "am I allowed to do this?" and only sends
 * the real request if the answer says yes. A plain GET with no special headers
 * skips it. cors() answers that OPTIONS check so the real request goes through.
 *
 * Who sends the preflight:
 * - The browser sends it automatically. Frontend code (fetch, axios) only
 *   makes the normal request, the browser decides whether a preflight is needed
 *   and sends it first. It shows as a separate OPTIONS call in the DevTools
 *   Network tab, right before the real request.
 * - Postman is not a browser, so it never sends a preflight by itself and does
 *   not enforce CORS. A request that works in Postman can still fail in the
 *   browser if the server has no CORS setup.
 *
 * Testing the preflight manually in Postman:
 * 1. Set the method to OPTIONS (type it in the method dropdown).
 * 2. Add these request headers:
 *    - Origin: http://localhost:3000 (the frontend origin asking permission)
 *    - Access-Control-Request-Method: POST (the method the real request will use)
 *    - Access-Control-Request-Headers: content-type, authorization (the headers
 *      the real request will send)
 * 3. Send it and open the response Headers tab. A working setup returns status
 *    204 with Access-Control-Allow-Origin and Access-Control-Allow-Methods.
 * Without it, a frontend would work in Postman but fail in the browser.
 * Postman and curl are not browsers, so they never enforce CORS.
 *
 * Request headers vs response headers:
 * - Request headers are sent by the client to the server (Host, User-Agent,
 *   Accept, Authorization...). In Postman they are in the request's Headers tab.
 * - Response headers are sent by the server back to the client
 *   (Content-Type, Access-Control-Allow-Origin...). In Postman they are in the
 *   response panel's Headers tab, after sending the request.
 * So Access-Control-Allow-Origin will not appear in the request headers: it is
 * added by the server, so look for it in the response headers.
 *
 * Credentials (cookies or credentials: "include" / withCredentials: true):
 * - The wildcard "*" is NOT accepted by the browser when the frontend sends
 *   credentials. The server must name the exact origin instead and also send
 *   Access-Control-Allow-Credentials: true.
 *   cors({ origin: "http://localhost:3000", credentials: true })
 * - This is a separate rule from preflight: preflight asks "may I send this
 *   request?", the credentials rule limits what the answer may contain. Both can
 *   apply to the same request, the OPTIONS response and the real response.
 * - An Authorization header alone does not need credentials: "include", so "*"
 *   still works for it.
 */
app.use(cors());
/*
 * Compress response bodies (gzip, deflate or br) for every request that goes
 * through this middleware, based on the client's Accept-Encoding header.
 *
 * It never compresses a response that has a Cache-Control header with the
 * no-transform directive, because compressing changes (transforms) the body.
 * This is about the RESPONSE header and is not the same as no-cache: the
 * Cache-Control: no-cache that Postman sends is a request header about reusing
 * stored copies, so it does not stop compression. Small bodies (under 1 KB by
 * default) are also skipped. Check for Content-Encoding in the response headers.
 *
 * The three encodings are ways to shrink a response body before sending it,
 * and the browser unpacks it automatically:
 * - gzip: the most common, works everywhere. Good compression, fast.
 * - deflate: the older algorithm that gzip is built on. Rarely used now.
 * - br (Brotli): Google's newer algorithm, "br" is its name in the headers.
 *   About 15-25% smaller than gzip, but slower to compress. Mostly used for
 *   static files over HTTPS.
 * The client lists what it supports in Accept-Encoding: gzip, deflate, br. The
 * server picks one and says which in the response header Content-Encoding.
 * Brotli support depends on the installed version of this package.
 */
app.use(compression());
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

/*
 * Must come before express.json().
 *
 * How the Stripe signature check works:
 * 1. Stripe has the event as a JSON string and encodes it to bytes (UTF-8) to
 *    send it. Everything over HTTP is bytes, so the JSON string goes out as
 *    bytes. The string and its bytes are the same data, bytes are just how it
 *    is stored and sent.
 * 2. Stripe hashes those bytes (HMAC-SHA256, with a timestamp in front) using
 *    our webhook secret (whsec_...) and sends the result in the Stripe-Signature
 *    header. The body itself is plain, not encrypted.
 * 3. We receive those exact bytes. express.raw() keeps them as-is in a Buffer.
 * 4. stripe.webhooks.constructEvent repeats the same hash on that Buffer with
 *    our secret and compares it to the header. If they match, the body came
 *    from Stripe and was not changed. Then it parses the JSON into the event.
 *
 * Why not express.json(): it reads the Buffer, converts it to text, runs
 * JSON.parse and puts the object in req.body. The original bytes are not kept.
 * Turning the object back into text could differ (spacing, key order, escaped
 * characters), which gives different bytes, a different hash and a failed
 * check. So this route uses express.raw(), and express.json() below only runs
 * for the other routes.
 */
app.post(
  "/webhook-checkout",
  express.raw({ type: "application/json" }),
  webhookCheckoutService,
);

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
mountRoutes(app);

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

module.exports = app;
