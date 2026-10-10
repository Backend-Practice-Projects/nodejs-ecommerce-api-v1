const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      /*
       * Schema-level trim runs on Mongoose's own validation pass, which fires on
       * save/create (and on update only when { runValidators: true } is passed) -
       * separate from and after the express-validator checks in user_validator.js,
       * which run first on the raw request body before this document is built.
       *
       * The validator only guards the HTTP route; anything that talks to Mongoose
       * directly (a seeder, migration, admin script, mongo shell insert) bypasses
       * it entirely.
       */
      trim: true,
      required: [true, "Name required"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email required"],
      unique: true,
      lowercase: true,
    },
    phone: String,
    profileImg: String,
    password: {
      type: String,
      required: [true, "Password required"],
      minlength: [6, "Too short password"],
    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    role: {
      type: String,
      enum: ["user", "manager", "admin"],
      default: "user",
    },
    active: {
      type: Boolean,
      default: true,
    },
    //Child reference (one to many)
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    /*
     * Embedded documents (one to few): the addresses live inside the user
     * document instead of their own collection, because they are few, owned
     * by exactly one user, and always read together with that user.
     * Mongoose gives each array element its own _id automatically, which is
     * what the remove endpoint targets.
     */
    addresses: [
      {
        alias: { type: String, trim: true },
        details: { type: String, trim: true },
        phone: String,
        city: { type: String, trim: true },
        postalCode: String,
      },
    ],
  },
  { timestamps: true },
);
const setImageURL = (doc) => {
  if (doc.profileImg) {
    const imageURL = `${process.env.BASE_URL}/users/${doc.profileImg}`;
    doc.profileImg = imageURL;
  }
};

/*
 * An async pre-save hook is awaited via its returned promise, not via a `next`
 * callback - Mongoose does not pass `next` as an argument when the function is
 * async. Declaring `async function (next)` and then calling `next()` crashes
 * with "next is not a function" because `next` is undefined here; just return
 * (or let the function resolve) instead.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  // "await has no effect" lint here is a misconfig - bcrypt.hash returns a promise
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.post("init", function (doc) {
  setImageURL(doc);
});
userSchema.post("save", function (doc) {
  setImageURL(doc);
});
const UserDoc = mongoose.model("User", userSchema);

module.exports = UserDoc;
