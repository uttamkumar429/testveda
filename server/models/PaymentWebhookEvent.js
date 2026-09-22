const mongoose = require("mongoose");

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    event: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PROCESSING", "PROCESSED", "FAILED"],
      required: true,
      default: "PROCESSING",
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model(
  "PaymentWebhookEvent",
  paymentWebhookEventSchema
);
