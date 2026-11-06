/*
 * Input sanitization against NoSQL injection and XSS.
 *
 * We use MongoDB, so classic SQL injection does not apply, the equivalent is
 * NoSQL (operator) injection: sending { "email": { "$gt": "" } } as a value so
 * the query matches every document (e.g. logging in without a password).
 *
 * Why a custom middleware and not express-mongo-sanitize / xss-clean:
 * in Express 5 req.query is a getter that is re-parsed on every access, so those
 * packages (which assign or mutate req.query) silently stop working or throw.
 * Here req.query is replaced with Object.defineProperty instead.
 */

/*
 * A regex that matches any field name containing "password" (the i flag ignores
 * case), e.g. password, passwordConfirm, currentPassword.
 * Those fields are NOT escaped. Example: the user signs up with "a<b", we escape it
 * and save "a&lt;b" (hashed). At login they type "a<b" again, which is not escaped
 * the same way, so the hashes differ and login fails.
 * Passwords are never shown in a page, so there is no XSS risk in skipping them.
 */
const SKIP_ESCAPE_KEYS = /password/i;

/*
 * XSS protection: replaces every < with &lt; and every > with &gt;.
 * Browsers show &lt; as the character "<" but never treat it as an HTML tag,
 * so <script>alert(1)</script> becomes &lt;script&gt;alert(1)&lt;/script&gt;
 * and is displayed as plain text instead of running.
 * The /g flag means "replace all matches", not just the first one.
 * & and quotes are left alone so normal text like "Q&A" is not changed.
 */
const escapeHtml = (value) => value.replace(/</g, "&lt;").replace(/>/g, "&gt;");

/*
 * A key is dangerous (and removed) if it:
 * - starts with $ : MongoDB operator ($gt, $ne, $where...). {"email": {"$gt": ""}}
 *   matches every user instead of one.
 * - contains a dot : in MongoDB "a.b" means the field b inside a (dot notation).
 *   An attacker can reach nested fields we never meant to expose, e.g. sending
 *   {"address.city": "x"} or {"profile.role": "admin"} to read/overwrite an inner
 *   field when the body is passed straight into a query or update.
 */
const isDangerousKey = (key) => key.startsWith("$") || key.includes(".");

const sanitizeValue = (value, key = "") => {
  if (typeof value === "string") {
    return SKIP_ESCAPE_KEYS.test(key) ? value : escapeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  /*
   * A plain object ({ name: "Ali", ... }). The checks mean:
   * - value && : makes sure value is not null. In JavaScript typeof null is "object",
   *   so without this check null would pass and Object.entries(null) would throw.
   * - !Buffer.isBuffer(value) : a Buffer is raw binary data (e.g. an uploaded file),
   *   it is also typeof "object" but has no keys to clean, so it is returned as is.
   */
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    const clean = {};
    /*
     * Object.entries(value) turns { a: 1, b: 2 } into [["a", 1], ["b", 2]].
     * [k, v] is destructuring: each pair is split into k (the key) and v (the value).
     */
    for (const [k, v] of Object.entries(value)) {
      /*
       * Keep the pair only if the key is safe. The value is sanitized again
       * (recursion, for nested objects/arrays) and saved in the new object under
       * the same key. Passing k lets the string check know the field name
       * (to skip password fields).
       */
      if (!isDangerousKey(k)) clean[k] = sanitizeValue(v, k);
    }
    return clean;
  }
  return value;
};

/*
 * Example: the body {"email": {"$gt": ""}} goes through these steps:
 * 1. sanitizeValue(req.body) loops over the entries: ["email", {"$gt": ""}].
 * 2. "email" is a safe key, so its value {"$gt": ""} is sanitized again (recursion).
 * 3. Inside it, "$gt" starts with $ so isDangerousKey drops it, the result is {}.
 * 4. req.body becomes { email: {} }, so the "match every user" query can't happen
 *    and the validation layer rejects {} as an invalid email (400).
 * 5. params and query get the same cleaning, then next() passes the request on.
 */
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);

  /*
   * req.query can't be assigned directly in Express 5 (it is a getter that
   * re-parses the URL on every access), so we define it as a normal property
   * on req holding the cleaned copy.
   */
  const cleanQuery = sanitizeValue(req.query);
  Object.defineProperty(req, "query", {
    // The value stored in req.query: our cleaned copy.
    value: cleanQuery,
    // true: later code can still assign req.query = ... (false would silently ignore it).
    writable: true,
    // true: the property can be redefined or deleted later (e.g. by another middleware).
    configurable: true,
    // true: shows up in loops and Object.keys(req) / console.log(req), like a normal property.
    enumerable: true,
  });
  next();
};

module.exports = sanitizeMiddleware;
