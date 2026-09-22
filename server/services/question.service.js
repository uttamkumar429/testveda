const mongoose = require("mongoose");

const Question = require("../models/Question");
const Test = require("../models/Test");
const ApiError = require("../utils/ApiError");
const {
  enqueueQuestionTranslation,
} = require("./translationJob.service");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "subject",
  "chapter",
  "difficulty",
  "marks",
]);

const normalizeString = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const normalizePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const validateObjectId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(400, "Invalid question ID.");
  }

  return id;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchRegex = (search) => {
  const normalized = normalizeString(search);

  return normalized
    ? new RegExp(escapeRegex(normalized), "i")
    : null;
};

const normalizeQuestionData = (data = {}) => ({
  subject: normalizeString(data.subject),
  chapter: normalizeString(data.chapter),
  question: normalizeString(data.question),
  optionA: normalizeString(data.optionA),
  optionB: normalizeString(data.optionB),
  optionC: normalizeString(data.optionC),
  optionD: normalizeString(data.optionD),
  correctAnswer: normalizeString(data.correctAnswer).toUpperCase(),
  difficulty: normalizeString(data.difficulty, "Medium"),
  marks: Number(data.marks),
  explanation: normalizeString(data.explanation),
});

const assertValidQuestionData = (data) => {
  const requiredStrings = [
    ["subject", data.subject],
    ["chapter", data.chapter],
    ["question", data.question],
    ["optionA", data.optionA],
    ["optionB", data.optionB],
    ["optionC", data.optionC],
    ["optionD", data.optionD],
  ];

  const missing = requiredStrings.find(([, value]) => !value);

  if (missing) {
    throw new ApiError(400, `${missing[0]} is required.`);
  }

  if (!["A", "B", "C", "D"].includes(data.correctAnswer)) {
    throw new ApiError(400, "Correct Answer must be A, B, C or D.");
  }

  if (!["Easy", "Medium", "Hard"].includes(data.difficulty)) {
    throw new ApiError(400, "Difficulty must be Easy, Medium or Hard.");
  }

  if (!Number.isFinite(data.marks) || data.marks < 1 || data.marks > 100) {
    throw new ApiError(400, "Marks must be between 1 and 100.");
  }
};

// =====================================
// CREATE QUESTION
// =====================================

const isTranslationEnabled = () =>
  process.env.TRANSLATION_ENABLED !== undefined
    ? String(process.env.TRANSLATION_ENABLED).toLowerCase() !== "false"
    : process.env.NODE_ENV !== "test";

const enqueueTranslationSafely = async (questionId) => {
  if (!isTranslationEnabled()) return;

  try {
    await enqueueQuestionTranslation(questionId);
  } catch (error) {
    console.error(
      `[QuestionTranslation] Failed to enqueue translation job for ${questionId}: ${
        error?.message || "Unknown error"
      }`
    );
  }
};

// =====================================
// CREATE QUESTION
// =====================================

const createQuestion = async (questionData) => {
  const normalized = normalizeQuestionData(questionData);

  assertValidQuestionData(normalized);

  let createdQuestion;

  try {
    /*
     * Translation is deliberately NOT part of the HTTP request.
     * The core question is persisted first. A durable MongoDB job
     * handles Hindi translation asynchronously.
     */
    createdQuestion = await Question.create({
      ...normalized,
      createdBy: questionData.createdBy,
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      throw new ApiError(400, "Invalid question data.");
    }

    throw error;
  }

  await enqueueTranslationSafely(createdQuestion._id);

  return createdQuestion;
};

// =====================================
// GET ALL QUESTIONS
// =====================================

const getAllQuestions = async (
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search = "",
  subject = "",
  chapter = "",
  difficulty = "",
  sortBy = "createdAt",
  order = "desc"
) => {
  const safePage = normalizePositiveInt(
    page,
    DEFAULT_PAGE,
    Number.MAX_SAFE_INTEGER
  );

  const safeLimit = normalizePositiveInt(
    limit,
    DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy)
    ? sortBy
    : "createdAt";

  const safeOrder = order === "asc" ? 1 : -1;

  const filter = {};
  const searchRegex = buildSearchRegex(search);

  if (searchRegex) {
    filter.$or = [
      { subject: searchRegex },
      { chapter: searchRegex },
      { question: searchRegex },
      { optionA: searchRegex },
      { optionB: searchRegex },
      { optionC: searchRegex },
      { optionD: searchRegex },
    ];
  }

  const normalizedSubject = normalizeString(subject);
  const normalizedChapter = normalizeString(chapter);
  const normalizedDifficulty = normalizeString(difficulty);

  if (normalizedSubject) {
    filter.subject = normalizedSubject;
  }

  if (normalizedChapter) {
    filter.chapter = normalizedChapter;
  }

  if (normalizedDifficulty) {
    if (!["Easy", "Medium", "Hard"].includes(normalizedDifficulty)) {
      throw new ApiError(400, "Invalid difficulty filter.");
    }

    filter.difficulty = normalizedDifficulty;
  }

  const skip = (safePage - 1) * safeLimit;

  const sort = {
    [safeSortBy]: safeOrder,
    _id: safeOrder,
  };

  const [total, questions] = await Promise.all([
    Question.countDocuments(filter),

    Question.find(filter)
      .select(
        "subject chapter difficulty question optionA optionB optionC optionD correctAnswer explanation questionHindi optionAHindi optionBHindi optionCHindi optionDHindi explanationHindi marks createdBy createdAt updatedAt"
      )
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .populate("createdBy", "fullName email")
      .lean(),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / safeLimit)
  );

  return {
    questions,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};

// =====================================
// FILTER METADATA
// =====================================

const getQuestionMetadata = async () => {
  const [subjects, chapterPairs] = await Promise.all([
    Question.distinct("subject", {
      subject: { $nin: [null, ""] },
    }),

    Question.find({
      subject: { $nin: [null, ""] },
      chapter: { $nin: [null, ""] },
    })
      .select("subject chapter -_id")
      .lean(),
  ]);

  const chaptersBySubject = {};

  for (const item of chapterPairs) {
    const subject = normalizeString(item.subject);
    const chapter = normalizeString(item.chapter);

    if (!subject || !chapter) continue;

    if (!chaptersBySubject[subject]) {
      chaptersBySubject[subject] = new Set();
    }

    chaptersBySubject[subject].add(chapter);
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(chaptersBySubject).map(([key, value]) => [
      key,
      [...value].sort((a, b) => a.localeCompare(b)),
    ])
  );

  return {
    subjects: subjects
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),

    chaptersBySubject: normalizedMap,
  };
};

// =====================================
// GET QUESTION BY ID
// =====================================

const getQuestionById = async (id) => {
  validateObjectId(id);

  return Question.findById(id)
    .select(
      "subject chapter difficulty question optionA optionB optionC optionD correctAnswer explanation questionHindi optionAHindi optionBHindi optionCHindi optionDHindi explanationHindi marks createdBy createdAt updatedAt"
    )
    .populate("createdBy", "fullName email")
    .lean();
};

// =====================================
// UPDATE QUESTION
// =====================================

const updateQuestion = async (id, questionData = {}) => {
  validateObjectId(id);

  const existing = await Question.findById(id);

  if (!existing) {
    return null;
  }

  const normalized = normalizeQuestionData({
    ...existing.toObject(),
    ...questionData,
  });

  assertValidQuestionData(normalized);

  const translatableFieldsChanged = [
    "question",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "explanation",
  ].some(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        questionData,
        field
      ) &&
      normalizeString(existing[field]) !==
        normalizeString(questionData[field])
  );

  const updateData = {
    ...normalized,
  };

  delete updateData.createdBy;

  let updated;

  try {
    /*
     * Core question update is independent of translation.
     * No external translation provider is called here.
     */
    updated = await Question.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    )
      .populate("createdBy", "fullName email")
      .lean();
  } catch (error) {
    if (error?.name === "ValidationError") {
      throw new ApiError(400, "Invalid question data.");
    }

    throw error;
  }

  if (!updated) {
    return null;
  }

  if (translatableFieldsChanged) {
    await enqueueTranslationSafely(id);
  }

  return updated;
};

// =====================================
// DELETE QUESTION
// =====================================

const deleteQuestion = async (id) => {
  validateObjectId(id);

  const question = await Question.findById(id)
    .select("_id")
    .lean();

  if (!question) {
    return null;
  }

  /*
   * A question referenced by a test must not be hard-deleted because
   * it would leave the Test document with a broken reference.
   */
  const referencedTest = await Test.findOne({
    questions: id,
  })
    .select("_id title status")
    .lean();

  if (referencedTest) {
    throw new ApiError(
      409,
      "Question cannot be deleted because it is used by a test. Remove it from the test first."
    );
  }

  await Question.findByIdAndDelete(id);

  return question;
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionMetadata,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};