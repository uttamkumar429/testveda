const Test = require("../models/Test");
const mongoose = require("mongoose");
const Question = require("../models/Question");
const ApiError = require("../utils/ApiError");
const TestSnapshot = require("../models/TestSnapshot");


// =====================================
// ESCAPE REGEX
// =====================================

const escapeRegex = (text) => {
  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// =====================================
// CHECK DUPLICATE TEST TITLE
// =====================================

const checkDuplicateTitle = async (
  title,
  excludeId = null
) => {

  const filter = {
    title: {
      $regex: `^${escapeRegex(title.trim())}$`,
      $options: "i",
    },
  };

  if (excludeId) {
    filter._id = {
      $ne: excludeId,
    };
  }

  const existingTest = await Test.findOne(filter).lean();

  if (existingTest) {
    throw new ApiError(
      409,
      "Test with this title already exists."
    );
  }
};

// =====================================
// VALIDATE TEST DATES
// =====================================

const validateTestDates = (
  startTime,
  endTime
) => {

  const now = new Date();

  const start = new Date(startTime);

  const end = new Date(endTime);

  if (start < now) {
    throw new ApiError(
      400,
      "Start time cannot be in the past."
    );
  }

  if (end <= start) {
    throw new ApiError(
      400,
      "End time must be greater than start time."
    );
  }

};


// // =====================================
// // COMMON BUSINESS LOGIC
// // =====================================
const processQuestions = async (questionIds) => {

  // Duplicate Check
  const uniqueIds = [...new Set(questionIds)];

  if (uniqueIds.length !== questionIds.length) {
    throw new ApiError(
      400,
      "Duplicate questions are not allowed."
    );
  }

  // Fetch Questions
  const questions = await Question.find({
    _id: { $in: questionIds },
  });

  const orderedQuestions = questionIds.map((id) =>
  questions.find(
    (question) =>
      question._id.toString() === id.toString()
  )
);

  // Invalid IDs
  if (questions.length !== questionIds.length) {
    throw new ApiError(
      400,
      "One or more Question IDs are invalid."
    );
  }

  // Same Subject Check
  const subject = questions[0].subject;

  const differentSubject = questions.find(
    (q) => q.subject !== subject
  );

  if (differentSubject) {
    throw new ApiError(
        400,
        "All selected questions must belong to the same subject."
    );
  }

  // Calculate Marks
  const totalMarks = questions.reduce(
    (sum, question) => sum + question.marks,
    0
  );

return {
  questions: orderedQuestions,
  totalMarks,
  totalQuestions: orderedQuestions.length,
};
};

// CREATE TEST

const createTest = async (testData) => {

// CHECK DUPLICATE TITLE
   await checkDuplicateTitle(testData.title);

// =====================================
// VALIDATE TEST DATES
// =====================================

  validateTestDates(
    testData.startTime,
    testData.endTime
  );

// =====================================
// PROCESS QUESTIONS
// =====================================

  const result = await processQuestions(
    testData.questions
  );

  const normalizedIsPaid = Boolean(testData.isPaid);
  const normalizedPrice = normalizedIsPaid
    ? Number(testData.price ?? 0)
    : 0;

  if (
    normalizedIsPaid &&
    (!Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0)
  ) {
    throw new ApiError(
      400,
      "Paid tests must have a price greater than 0."
    );
  }

// =====================================
// CREATE TEST
// =====================================
const test = await Test.create({
  title: testData.title.trim(),

  subject: testData.subject.trim(),

  description:
    testData.description?.trim() || "",

  isPaid: normalizedIsPaid,

  price: normalizedPrice,

  duration: Number(testData.duration),

  questions: result.questions.map(
    (question) => question._id
  ),

  totalQuestions: result.totalQuestions,

  totalMarks: result.totalMarks,

  createdBy: testData.createdBy,

  startTime: new Date(testData.startTime),

  endTime: new Date(testData.endTime),

  status: "draft",
});

// Populate response

  return await Test.findById(test._id)
    .populate(
      "createdBy",
      "fullName email"
    )
    .populate("questions")
    .lean();
}

// =====================================
// GET ALL TESTS
// =====================================

const getAllTests = async (
  page = 1,
  limit = 10,
  sort = "newest",
  status = "",
  subject = "",
  search = "",
  startDate = "",
  endDate = "",
  duration = ""
) => {

  page = Math.max(1, Number(page));
  limit = Math.min(100, Math.max(1, Number(limit)));

  const skip = (page - 1) * limit;

  // =====================================
  // FILTER
  // =====================================

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (subject) {
    filter.subject = subject.trim();
  }

  if (duration) {
    filter.duration = Number(duration);
  }

  // =====================================
  // SEARCH
  // =====================================

  if (search.trim()) {

    const keyword = escapeRegex(search.trim());

    filter.$or = [
      {
        title: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        subject: {
          $regex: keyword,
          $options: "i",
        },
      },
    ];

  }

  // =====================================
  // DATE FILTER
  // =====================================

  if (startDate || endDate) {

    filter.createdAt = {};

    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }

  }

  // =====================================
  // SORTING
  // =====================================

  const sortOptions = {
    newest: {
      createdAt: -1,
    },

    oldest: {
      createdAt: 1,
    },

    title: {
      title: 1,
    },

    subject: {
      subject: 1,
    },
  };

  const sortBy =
    sortOptions[sort] ||
    sortOptions.newest;

  // =====================================
  // DATABASE QUERY
  // =====================================

  const [total, tests] = await Promise.all([

    Test.countDocuments(filter),

    Test.find(filter)

      .select(
        `
        title
        subject
        duration
        totalMarks
        totalQuestions
        startTime
        endTime
        status
        isPaid
        price
        createdAt
        createdBy
        questions
        `
      )

      .populate(
        "createdBy",
        "fullName email"
      )

      .populate({
        path: "questions",

        select:
          "question subject chapter difficulty marks",
      })

      .sort(sortBy)

      .skip(skip)

      .limit(limit)

      .lean(),

  ]);

  // =====================================
  // PAGINATION
  // =====================================

  const totalPages =
    Math.ceil(total / limit);

  return {

    total,

    page,

    limit,

    totalPages,

    hasNextPage:
      page < totalPages,

    hasPrevPage:
      page > 1,

    tests,

  };

};

// =====================================
// GET TEST BY ID
// =====================================

const getTestById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      "Invalid test ID."
    );
  }

  const test = await Test.findById(id)
    .select(`
      title
      subject
      description
      duration
      totalMarks
      totalQuestions
      status
      isPaid
      price
      materials
      startTime
      endTime
      createdAt
      updatedAt
      createdBy
      questions
    `)
    .populate(
      "createdBy",
      "fullName email"
    )
    .populate({
      path: "questions",
      select: `
        subject
        chapter
        difficulty
        question
        optionA
        optionB
        optionC
        optionD
        correctAnswer
        explanation
        marks
      `,
    })
    .lean();

  if (!test) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  return {
    ...test,
    questions: Array.isArray(test.questions)
      ? test.questions
      : [],
  };
};
// // =====================================
// // UPDATE TEST
// // =====================================
const updateTest = async (id, data) => {

  const test = await Test.findById(id);

  if (!test) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  // Prevent editing published test
  if (test.status === "published") {
    throw new ApiError(
        409,
        "Published test cannot be updated."
    );
  }

  const normalizedUpdateIsPaid =
    data.isPaid !== undefined
      ? Boolean(data.isPaid)
      : Boolean(test.isPaid);

  const normalizedUpdatePrice = normalizedUpdateIsPaid
    ? Number(data.price ?? test.price ?? 0)
    : 0;

  if (
    normalizedUpdateIsPaid &&
    (!Number.isFinite(normalizedUpdatePrice) ||
      normalizedUpdatePrice <= 0)
  ) {
    throw new ApiError(
      400,
      "Paid tests must have a price greater than 0."
    );
  }

  // =====================================
// CHECK DUPLICATE TITLE
// =====================================

if (data.title) {
  await checkDuplicateTitle(
    data.title,
    id
  );
}

// =====================================
// VALIDATE TEST DATES
// =====================================

validateTestDates(
  data.startTime ?? test.startTime,
  data.endTime ?? test.endTime
);

const questionIds = Array.isArray(data.questions)
  ? data.questions
  : test.questions;

  const result = await processQuestions(questionIds);

const updateData = {
  title:
    data.title?.trim() ??
    test.title,

  subject:
    data.subject?.trim() ??
    test.subject,

  description:
    data.description?.trim() ??
    test.description,

  isPaid: normalizedUpdateIsPaid,

  price: normalizedUpdatePrice,

  duration:
      data.duration !== undefined
          ? Number(data.duration)
          : test.duration,

  questions: questionIds,

  totalMarks:
    result.totalMarks,

  totalQuestions:
    result.totalQuestions,

  startTime:
    data.startTime ??
    test.startTime,

  endTime:
    data.endTime ??
    test.endTime,
};

  return await Test.findByIdAndUpdate(
    id,
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
    }
  )
  .populate("questions")
  .populate("createdBy", "fullName email")
  .lean();
    
 };// =====================================
// DELETE TEST
// =====================================

const deleteTest = async (id) => {

  // =====================================
  // FIND TEST
  // =====================================

  const test = await Test.findById(id)
    .select("status")
    .lean();

  if (!test) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  // =====================================
  // BUSINESS RULE
  // =====================================

  if (test.status === "published") {
    throw new ApiError(
      409,
      "Published test cannot be deleted."
    );
  }

  // =====================================
  // DELETE
  // =====================================

  await Test.findByIdAndDelete(id);

  return true;

};

// Publish Test
// =====================================
// PUBLISH TEST
// =====================================

const publishTest = async (id) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // =====================================
    // FIND TEST WITH QUESTIONS
    // =====================================
  const test = await Test.findById(id)
    .populate({
      path: "questions",
      select: `
        subject
        chapter
        difficulty

        question
        optionA
        optionB
        optionC
        optionD
        correctAnswer
        explanation

        questionHindi
        optionAHindi
        optionBHindi
        optionCHindi
        optionDHindi
        explanationHindi

        marks
      `,
    })
    .session(session);

    if (!test) {
      throw new ApiError(
        404,
        "Test not found."
      );
    }

    // =====================================
    // CHECK STATUS
    // =====================================

    if (test.status === "published") {
      throw new ApiError(
        409,
        "Test is already published."
      );
    }

    // =====================================
    // CHECK QUESTIONS
    // =====================================

    if (
      !Array.isArray(test.questions) ||
      test.questions.length === 0
    ) {
      throw new ApiError(
        400,
        "Cannot publish a test without questions."
      );
    }

    // =====================================
    // CREATE QUESTION SNAPSHOT
    // =====================================

      const snapshot = await TestSnapshot.create(
        [
          {
            testId: test._id,

            title: test.title,

            subject: test.subject,

            isPaid: test.isPaid,

            price: test.price,

            materials: test.materials,

            duration: test.duration,

            totalMarks: test.totalMarks,

            totalQuestions: test.totalQuestions,

            startTime: test.startTime,

            endTime: test.endTime,

            questions: test.questions.map((question) => ({
            questionId: question._id,

            subject: question.subject,
            chapter: question.chapter,
            difficulty: question.difficulty,

            // =====================================
            // ENGLISH
            // =====================================

            question: question.question,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            explanation: question.explanation,

            // =====================================
            // HINDI
            // =====================================

            questionHindi: question.questionHindi || "",
            optionAHindi: question.optionAHindi || "",
            optionBHindi: question.optionBHindi || "",
            optionCHindi: question.optionCHindi || "",
            optionDHindi: question.optionDHindi || "",
            explanationHindi: question.explanationHindi || "",

            // =====================================
            // EXAM DATA
            // =====================================

            correctAnswer: question.correctAnswer,
            marks: question.marks,
          })),
        },
      ],
      { session }
    );

    // =====================================
    // UPDATE TEST STATUS
    // =====================================

    test.status = "published";

    await test.save({
      session,
    });

    // =====================================
    // COMMIT TRANSACTION
    // =====================================

    await session.commitTransaction();

    return snapshot[0];

  } catch (error) {

    await session.abortTransaction();

    throw error;

  } finally {

    session.endSession();

  }
};

module.exports = {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  processQuestions,
  publishTest,
};
