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
      /*
       * Hide the password hash from every query by default so it can't leak
       * in a response. Code that needs it (login, change password) must ask
       * with .select("+password").
       *
       * Why a leaked hash is dangerous:
       *  - Offline cracking: the attacker hashes millions of likely passwords
       *    on their own machine and compares each one to the stolen hash.
       *    There are no rate limits, no lockouts and no server logs, so we
       *    can't detect or stop it.
       *  - If a guess matches, they know the real password. Many users reuse
       *    passwords, so it can then be used on their other accounts/sites.
       *
       * Keeping the hash private forces the attacker to guess through the
       * login endpoint instead, where we can rate-limit, lock out and monitor
       * the attempts.
       */
      select: false,
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
  {
    timestamps: true,
    /*
     * Alternative to select: false. The transform runs every time the doc is
     * converted to JSON (res.json(user) calls toJSON), so the hash is removed
     * from every response automatically - even right after create() or after
     * a query that selected it (login), with no manual
     * `user.password = undefined`.
     * Note: it only affects JSON output. It won't protect anything that doesn't
     * go through toJSON, like toObject() or logging the doc. user.password is
     * still readable in code, so bcrypt.compare keeps working without .select("+password").
     */
    toJSON: {
      /*
       * The eslint-disable comment below tells ESLint to skip a rule on the
       * NEXT line only.
       * Here it silences the warning about the unused `doc` parameter
       * (no-unused-vars only allows unused req|res|next args in this project).
       *
       * Format: // eslint-disable-next-line <rule-name>
       *  - With a rule name it skips only that rule. Several rules are
       *    comma-separated: // eslint-disable-next-line no-console, no-unused-vars
       *  - WITHOUT a rule name it skips ALL rules on that line, so no warning
       *    shows at all. Prefer naming the rule.
       * Other forms: add `// eslint-disable-line <rule>` at the end of the same
       * line, or use a block comment `eslint-disable <rule>` to cover a whole
       * block/file.
       * The rule name is the code ESLint shows in the warning.
       */
      /*transform(doc, ret) {
        delete ret.password;
        return ret;
      }, */
    },
  },
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
