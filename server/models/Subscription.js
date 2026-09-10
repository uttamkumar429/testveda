const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // =========================================
    // STUDENT
    // =========================================

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =========================================
    // PLAN
    // =========================================

    plan: {
      type: String,
      enum: ["MONTHLY"],
      default: "MONTHLY",
      required: true,
      index: true,
    },

    // =========================================
    // PAYMENT
    // =========================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: "INR",
    },

    // =========================================
    // STATUS
    // =========================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
      ],
      default: "PENDING",
      required: true,
      index: true,
    },

    // =========================================
    // SUBSCRIPTION PERIOD
    // =========================================

    startDate: {
      type: Date,
      default: null,
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
      index: true,
    },

    // =========================================
    // RAZORPAY
    // =========================================

    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    // =========================================
    // AUDIT
    // =========================================

    activatedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================
// ACTIVE SUBSCRIPTION LOOKUP
// =========================================

subscriptionSchema.index({
  student: 1,
  status: 1,
  endDate: -1,
});

// =========================================
// RAZORPAY ORDER LOOKUP
// =========================================

subscriptionSchema.index({
  razorpayOrderId: 1,
  student: 1,
});

// =========================================
// RAZORPAY PAYMENT LOOKUP
// =========================================

subscriptionSchema.index({
  razorpayPaymentId: 1,
  student: 1,
});

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);