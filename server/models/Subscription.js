const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["MONTHLY"],
      default: "MONTHLY",
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
      required: true,
      uppercase: true,
      trim: true,
      default: "INR",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "FAILED",
      ],
      default: "PENDING",
      required: true,
      index: true,
    },

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

    pendingKey: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    failureReason: {
      type: String,
      default: null,
      maxlength: 500,
    },

    orderCreationLockUntil: {
      type: Date,
      default: null,
    },

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

subscriptionSchema.index({
  student: 1,
  status: 1,
  endDate: -1,
});

subscriptionSchema.index({
  student: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);
