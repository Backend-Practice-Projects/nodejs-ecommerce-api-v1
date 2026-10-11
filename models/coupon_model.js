const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, "Coupon name is required"],
      unique: true,
    },
    expire: {
      type: Date,
      required: [true, "Coupon expire date is required"],
    },
    //Percentage taken off the total price
    discount: {
      type: Number,
      required: [true, "Coupon discount value is required"],
      min: [1, "Coupon discount must not be less than 1"],
      max: [100, "Coupon discount must not be greater than 100"],
    },
  },
  {
    timestamps: true,
  },
);

const CouponDoc = mongoose.model("Coupon", couponSchema);

module.exports = CouponDoc;
