/*
 * Whitelist approach: build the response from ONLY the fields we want to
 * expose, instead of removing the sensitive ones. A field added to the schema
 * later (password, reset codes, ...) stays private by default, because it must
 * be added here on purpose to be returned.
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  profileImg: user.profileImg,
  role: user.role,
  active: user.active,
});

module.exports = sanitizeUser;
