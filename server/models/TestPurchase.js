const mongoose = require("mongoose");

const testPurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    testSnapshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSnapshot",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

testPurchaseSchema.index(
  { student: 1, testSnapshot: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "TestPurchase",
  testPurchaseSchema
);
