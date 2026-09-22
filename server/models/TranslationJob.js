const mongoose = require("mongoose");

const translationJobSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: "",
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

translationJobSchema.index({
  status: 1,
  nextAttemptAt: 1,
});

module.exports = mongoose.model(
  "TranslationJob",
  translationJobSchema
);
