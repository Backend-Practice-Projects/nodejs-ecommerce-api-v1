/*
 * The node:crypto module is a built-in Node.js library that provides robust cryptographic
 * functionality, wrapping OpenSSL's methods. It allows you to perform operations like hashing,
 * HMAC generation, data encryption/decryption, and signing.
 * Because it is built directly into the runtime environment, you do not need to install
 * external packages like crypto-js to use these features.
 */
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const UserDoc = require("../models/user_model");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/api_error");
const sendEmail = require("../utils/send_email");
const generateToken = require("../utils/generate_token");

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

  //[1.1] Logging back in reactivates a deactivated account
  if (!user.active) {
    user.active = true;
    await user.save();
  }

  //[2] Generate and send the JWT
  const token = generateToken(user._id);

  res.status(200).json({ data: user, token });
});

// @desc    Send a 6-digit reset code to the user's email
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPasswordService = asyncHandler(async (req, res, next) => {
  //[1] Find the user by email
  const user = await UserDoc.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`There is no user with email ${req.body.email}`, 404),
    );
  }

  /*
   * [2] Generate a 6-digit reset code and store only its hash (like a password).
   * "Like a password" means the same pattern only: never store the raw secret,
   * store its hash, and compare by re-hashing the incoming value and checking equality.
   * It is not the same algorithm and not encryption (encryption is reversible with a key,
   * hashing is one-way).
   * We use crypto/sha256 here instead of bcrypt because bcrypt is deliberately slow and
   * salted to resist brute-forcing a low-entropy password. A reset code is a 6-digit
   * number (1M combinations) with a short 10-minute expiry, so bcrypt's slowness adds no
   * real benefit, and we need a fast, deterministic hash to do a direct === comparison
   * (bcrypt requires its own async compare function and is intentionally slow).
   */
  /*
   * Math.random() * 900000 gives a float in [0, 900000), adding 100000 shifts
   * the range to [100000, 1000000), and Math.floor rounds it down to an integer.
   * Result: a random 6-digit number, always between 100000 and 999999 (never
   * fewer than 6 digits). toString() converts it to a string for hashing/storage.
   *
   * Example: Math.random() -> 0.3721
   *          0.3721 * 900000 = 334890
   *          100000 + 334890 = 434890
   *          Math.floor(434890) = 434890 -> "434890"
   *
   * Why 100000/900000: Math.random() alone gives [0, 1), so without the +100000
   * shift, a result like 0.000005 * 900000 = 5 would produce a code with fewer
   * than 6 digits. Shifting the range to [100000, 1000000) guarantees exactly 6.
   */
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  /*
   * .update(resetCode) feeds the code into the hash algorithm.
   * .digest(encoding) finalizes the hash and outputs the result. A SHA-256 hash is
   * really just 32 raw bytes; digest("hex") tells it to encode those bytes as a
   * hexadecimal string (64 hex characters) instead of returning a raw Buffer.
   * Other options would be "base64" or no argument at all (which returns a Buffer).
   * "hex" is chosen because it's easy to store as a plain string in MongoDB and
   * compare directly with === against another hex-encoded hash, with no
   * binary/encoding mismatches to worry about.
   */
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  user.passwordResetCode = hashedResetCode;
  /*
   * Date.now() is the current time in milliseconds; adding 10 * 60 * 1000
   * (10 minutes in ms) sets the expiry timestamp to 10 minutes from now.
   */
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.passwordResetVerified = false;
  await user.save();

  //[3] Send the plain reset code to the user's email
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code (valid for 10 min)",
      message: `Hi ${user.name},\nWe received a request to reset the password for your account.\n${resetCode}\nEnter this code to complete the reset.`,
    });
  } catch (err) {
    console.error(err);
    //[4] Roll back the reset fields if the email failed to send
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    return next(new ApiError("There is an error sending the email", 500));
  }

  res
    .status(200)
    .json({ status: "Success", message: "Reset code sent to email" });
});

// @desc    Verify the reset code sent to the user's email
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPasswordResetCodeService = asyncHandler(
  async (req, res, next) => {
    //[1] Hash the submitted code and look up a user with a matching, unexpired one
    const hashedResetCode = crypto
      .createHash("sha256")
      .update(req.body.resetCode)
      .digest("hex");

    const user = await UserDoc.findOne({
      passwordResetCode: hashedResetCode,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return next(new ApiError("Reset code invalid or expired", 400));
    }

    //[2] Mark the code as verified so resetPasswordService can trust it
    user.passwordResetVerified = true;
    await user.save();

    res.status(200).json({ status: "Success" });
  },
);

// @desc    Reset the user's password after the reset code has been verified
// @route   PUT /api/v1/auth/resetPassword
// @access  Public
exports.resetPasswordService = asyncHandler(async (req, res, next) => {
  //[1] Find the user by email
  const user = await UserDoc.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`There is no user with email ${req.body.email}`, 404),
    );
  }

  //[2] Make sure the reset code was verified first
  if (!user.passwordResetVerified) {
    return next(new ApiError("Reset code not verified", 400));
  }

  //[3] Update the password and clear the reset fields
  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;
  await user.save();

  //[4] Log the user in with a fresh token
  const token = generateToken(user._id);

  res.status(200).json({ token });
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

  //[3.1] Block deactivated accounts from using their still-valid token
  if (!user.active) {
    return next(
      new ApiError("This account has been deactivated, please contact support", 401),
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

/*
 * Authorization middleware - must run after protect, since it relies on
 * req.user. (...roles) is the rest operator - it collects every argument
 * into one array, so a route can call allowedTo("admin", "manager") with
 * as many roles as needed.
 *
 * allowedTo("admin") runs once, when the route is defined, and returns the
 * inner asyncHandler function below - that's what Express actually stores
 * and calls on each request. The inner function still has access to
 * `roles` via closure (it keeps a reference to the variables of the outer
 * function it was created in, even after that outer function has already
 * returned). req.user itself is populated earlier in the same request by
 * protect, which always runs before allowedTo in the route's middleware
 * chain.
 */
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403),
      );
    }
    next();
  });
