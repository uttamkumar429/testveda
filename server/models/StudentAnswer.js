const mongoose = require("mongoose");

const studentAnswerSchema = new mongoose.Schema(
  {
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedAnswer: {
      type: String,
      enum: ["A", "B", "C", "D", null],
      default: null,
    },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    isCorrect: { type: Boolean, default: false },

    // Positive for correct marks; negative for a wrong answer.
    marksAwarded: { type: Number, default: 0 },

    // Stored separately so the result can show the exact deduction.
    negativeMarksAwarded: { type: Number, default: 0, min: 0 },

    timeSpent: { type: Number, default: 0, min: 0 },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

studentAnswerSchema.index(
  { attempt: 1, questionId: 1 },
  { unique: true }
);

module.exports = mongoose.model("StudentAnswer", studentAnswerSchema);
