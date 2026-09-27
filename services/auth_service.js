const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const UserDoc = require("../models/user_model");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/api_error");

const generateToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRY_DATE,
  });

// @desc    User SignUp
// @route   POST /api/v1/auth/signUp
// @access  Public
exports.userSignUpService = asyncHandler(async (req, res, next) => {
  //[1] Create the user
  const user = await UserDoc.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  //[2] Generate and send the JWT
  const token = generateToken(user._id);

  res.status(201).json({ data: user, token });
});

/*
 * The signup token doesn't last forever - it expires (JWT_EXPIRY_DATE).
 * Login is how the user gets a fresh token on every future visit, without
 * signing up again.
 */
// @desc    User Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.userLoginService = asyncHandler(async (req, res, next) => {
  //[1] Find the user by email and check the password
  const user = await UserDoc.findOne({ email: req.body.email });

  /*
   * Same message for "No Such Email" and "Wrong Password" so the endpoint
   * can't be used to probe which emails are registered.
   */
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  //[2] Generate and send the JWT
  const token = generateToken(user._id);

  res.status(200).json({ data: user, token });
});

// @desc    Verify the JWT on protected routes and attach the user to req
exports.protect = asyncHandler(async (req, res, next) => {
  //[1] Get the token from the Authorization header
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new ApiError("You are not logged in, please login first", 401));
  }

  /*
   * [2] Verify the token. This throws if the token is malformed, has a bad
   * signature (doesn't match JWT_SECRET_KEY), or has a tampered payload
   * (any of these come back as JsonWebTokenError), or if the token is
   * expired (past JWT_EXPIRY_DATE, comes back as TokenExpiredError). We
   * catch it here to turn jwt's own error classes into our ApiError shape
   * instead of letting the raw error reach the client.
   */
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(
        new ApiError("Your session has expired, please login again", 401),
      );
    }
    return next(new ApiError("Invalid token, please login again", 401));
  }

  //[3] Check the user still exists
  const user = await UserDoc.findById(decoded.sub);
  if (!user) {
    return next(
      new ApiError("The user belonging to this token no longer exists", 401),
    );
  }

  /*
   * Check the user didn't change their password after the token was issued -
   * a stolen/old token should stop working once the password is changed.
   * passwordChangedAt is set in changeUserPasswordService (user_service.js).
   */
  if (user.passwordChangedAt) {
    /*
     * passwordChangedAt is a Date object, not a number, so it can't be
     * divided directly - getTime() converts it to a millisecond timestamp
     * first. decoded.iat (the token's "issued at" claim) is in seconds per
     * the JWT spec, so dividing by 1000 converts ms to seconds to make the
     * two comparable. parseInt() then drops the fractional part left over
     * from that division (e.g. 1699999999.5 -> 1699999999), since iat
     * itself is always a whole number. The second argument, 10, is the
     * radix (base) - it means "read this as base 10 (decimal)", the normal
     * counting system; it has nothing to do with truncating the fraction,
     * which parseInt always does regardless of the radix passed.
     */
    const passwordChangedTimestamp = parseInt(
      user.passwordChangedAt.getTime() / 1000,
      10,
    );
    //iast short for issued at
    if (decoded.iat < passwordChangedTimestamp) {
      return next(
        new ApiError("User recently changed password, please login again", 401),
      );
    }
  }

  req.user = user;
  next();
});
