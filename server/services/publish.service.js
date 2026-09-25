const Test = require("../models/Test");
const TestSnapshot = require("../models/TestSnapshot");
const ApiError = require("../utils/ApiError");
// =====================================
// PUBLISH TEST
// =====================================
const publishTest = async (testId) => {

  // Find Test
  const test = await Test.findById(testId)
    .populate("questions");

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  if (test.status === "published") {
    throw new ApiError(409, "Test is already published.");
  }

  if (!test) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  // Only Draft can be published
  if (test.status !== "draft") {
    throw new Error("Only draft tests can be published.");
  }

  // Paid tests must have a valid price before a snapshot is created.
  if (
    test.isPaid &&
    (!Number.isFinite(Number(test.price)) ||
      Number(test.price) <= 0)
  ) {
    throw new ApiError(
      400,
      "Paid tests must have a price greater than 0."
    );
  }

  // Check Snapshot Already Exists
  const existingSnapshot = await TestSnapshot.findOne({
    testId,
  });

  if (existingSnapshot) {
    throw new ApiError(
      409,
      "Snapshot already exists."
    );
  }

  // Create Snapshot
  await TestSnapshot.create({

    testId: test._id,

    title: test.title,

    subject: test.subject,

    isPaid: Boolean(test.isPaid),

    price: Number(test.isPaid ? test.price : 0),

    materials: (test.materials || []).map((material) => ({
      title: material.title,
      description: material.description,
      url: material.url,
      publicId: material.publicId,
      originalName: material.originalName,
      resourceType: material.resourceType || "raw",
    })),

    duration: test.duration,

    totalMarks: test.totalMarks,

    totalQuestions: test.totalQuestions,

    startTime: test.startTime,

    endTime: test.endTime,

    questions: test.questions.map((q) => ({

      questionId: q._id,

      subject: q.subject,

      chapter: q.chapter,

      difficulty: q.difficulty,

      question: q.question,

      optionA: q.optionA,

      optionB: q.optionB,

      optionC: q.optionC,

      optionD: q.optionD,

      correctAnswer: q.correctAnswer,

      explanation: q.explanation,

      questionHindi: q.questionHindi,

      optionAHindi: q.optionAHindi,

      optionBHindi: q.optionBHindi,

      optionCHindi: q.optionCHindi,

      optionDHindi: q.optionDHindi,

      explanationHindi: q.explanationHindi,

      marks: q.marks,

      negativeMarks: Number(q.negativeMarks ?? 0),

    })),
  });

  // Update Status
  await Test.findByIdAndUpdate(
    test._id,
    {
      status: "published",
    },
    {
      runValidators: true,
    }
  );

  return test;
};

module.exports = {
  publishTest,
};