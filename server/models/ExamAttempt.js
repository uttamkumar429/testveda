const mongoose = require("mongoose");

const examAttemptSchema = new mongoose.Schema(
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
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ["IN-PROGRESS", "SUBMITTED"],
      default: "IN-PROGRESS",
      index: true,
    },
    currentQuestionIndex: { type: Number, default: 0 },
    visitedQuestions: [{ type: mongoose.Schema.Types.ObjectId }],
    reviewQuestions: [{ type: mongoose.Schema.Types.ObjectId }],
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    unansweredQuestions: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
    obtainedMarks: { type: Number, default: 0 },
    negativeMarksDeducted: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
  },
  { timestamps: true }
);

examAttemptSchema.index(
  { student: 1, testSnapshot: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
