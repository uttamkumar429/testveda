const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, index: true },
    chapter: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
      index: true,
    },
    question: { type: String, required: true, trim: true },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    explanation: { type: String, default: "" },

    // =====================================
    // HINDI CONTENT - MANUALLY ENTERED
    // =====================================
    questionHindi: { type: String, required: true, trim: true },
    optionAHindi: { type: String, required: true, trim: true },
    optionBHindi: { type: String, required: true, trim: true },
    optionCHindi: { type: String, required: true, trim: true },
    optionDHindi: { type: String, required: true, trim: true },
    explanationHindi: { type: String, default: "", trim: true },

    marks: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },

    // Marks deducted when the student selects a wrong answer.
    // 0 means no negative marking for this question.
    negativeMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
