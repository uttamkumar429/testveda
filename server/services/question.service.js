const Question = require("../models/Question");

const ApiError = require("../utils/ApiError");
const {
  translateQuestionToHindi,
} = require("./translation.service");
// =====================================
// CONSTANTS
// =====================================

const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "subject",
  "difficulty",
  "marks",
];

const ALLOWED_UPDATE_FIELDS = [
  "subject",
  "chapter",
  "difficulty",
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctAnswer",
  "explanation",
  "marks",
];

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
// SANITIZE UPDATE DATA
// =====================================

const buildQuestionUpdate = (data) => {
  const updateData = {};

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      updateData[field] = data[field];
    }
  }

  // -----------------------------------
  // Normalize string fields
  // -----------------------------------

  const stringFields = [
    "subject",
    "chapter",
    "question",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctAnswer",
    "difficulty",
    "explanation",
  ];

  for (const field of stringFields) {
    if (
      typeof updateData[field] === "string"
    ) {
      updateData[field] =
        updateData[field].trim();
    }
  }

  // -----------------------------------
  // Normalize marks
  // -----------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      updateData,
      "marks"
    )
  ) {
    updateData.marks = Number(
      updateData.marks
    );
  }

  return updateData;
};


// =====================================
// SAFE HINDI TRANSLATION
// =====================================

const safeTranslateQuestionToHindi = async (
  questionData
) => {
  // Tests must not call the external service.
  if (process.env.NODE_ENV === "test") {
    return {
      questionHindi: "",
      optionAHindi: "",
      optionBHindi: "",
      optionCHindi: "",
      optionDHindi: "",
      explanationHindi: "",
    };
  }

  // Production must not silently save
  // an English-only question.
  return await translateQuestionToHindi(
    questionData
  );
};

// =====================================
// CREATE QUESTION
// =====================================

const createQuestion = async (
  questionData
) => {
  const hindiTranslation =
    await safeTranslateQuestionToHindi(
      questionData
    );

  return await Question.create({
    ...questionData,

    ...hindiTranslation,
  });
};

// =====================================
// GET ALL QUESTIONS
// =====================================

const getAllQuestions = async (
  page = 1,
  limit = 10,
  search = "",
  subject = "",
  chapter = "",
  difficulty = "",
  sortBy = "createdAt",
  order = "desc"
) => {
  // -----------------------------------
  // Normalize pagination
  // -----------------------------------

  page = Math.max(
    1,
    Number(page)
  );

  limit = Math.min(
    100,
    Math.max(1, Number(limit))
  );

  const skip =
    (page - 1) * limit;

  // -----------------------------------
  // Build filter
  // -----------------------------------

  const filter = {};

  // -----------------------------------
  // Search
  // -----------------------------------

  const normalizedSearch =
    typeof search === "string"
      ? search.trim()
      : "";

  if (normalizedSearch) {
    const safeSearch =
      escapeRegex(
        normalizedSearch
      );

    filter.$or = [
      {
        subject: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        chapter: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        question: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  // -----------------------------------
  // Filters
  // -----------------------------------

  const normalizedSubject =
    typeof subject === "string"
      ? subject.trim()
      : "";

  if (normalizedSubject) {
    filter.subject =
      normalizedSubject;
  }

  const normalizedChapter =
    typeof chapter === "string"
      ? chapter.trim()
      : "";

  if (normalizedChapter) {
    filter.chapter =
      normalizedChapter;
  }

  const normalizedDifficulty =
    typeof difficulty === "string"
      ? difficulty.trim()
      : "";

  if (normalizedDifficulty) {
    filter.difficulty =
      normalizedDifficulty;
  }

  // -----------------------------------
  // Sorting
  // -----------------------------------

  const safeSortField =
    ALLOWED_SORT_FIELDS.includes(
      sortBy
    )
      ? sortBy
      : "createdAt";

  const safeOrder =
    order === "asc"
      ? 1
      : -1;

  const sort = {
    [safeSortField]: safeOrder,
  };

  // -----------------------------------
  // Database query
  // -----------------------------------

  const [total, questions] =
    await Promise.all([
      Question.countDocuments(
        filter
      ),

      Question.find(filter)
        .populate(
          "createdBy",
          "fullName email"
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

  return {
    total,
    page,
    limit,
    totalPages:
      Math.ceil(
        total / limit
      ),
    questions,
  };
};
// =====================================
// GET QUESTION FILTER METADATA
// =====================================

const getQuestionMetadata = async () => {
  const [subjects, chapterPairs] =
    await Promise.all([
      Question.distinct("subject"),

      Question.find({})
        .select("subject chapter")
        .lean(),
    ]);

  const chaptersBySubject = {};

  for (const item of chapterPairs) {
    const subject = item.subject?.trim();
    const chapter = item.chapter?.trim();

    if (!subject || !chapter) {
      continue;
    }

    if (!chaptersBySubject[subject]) {
      chaptersBySubject[subject] = new Set();
    }

    chaptersBySubject[subject].add(chapter);
  }

  const normalizedChaptersBySubject = {};

  for (const [subject, chapterSet] of Object.entries(
    chaptersBySubject
  )) {
    normalizedChaptersBySubject[subject] = [
      ...chapterSet,
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  return {
    subjects: [...subjects]
      .filter(Boolean)
      .sort((a, b) =>
        a.localeCompare(b)
      ),

    chaptersBySubject:
      normalizedChaptersBySubject,
  };
};

// =====================================
// GET QUESTION BY ID
// =====================================

const getQuestionById = async (
  id
) => {
  return await Question.findById(id)
    .populate(
      "createdBy",
      "fullName email"
    )
    .lean();
};

// =====================================
// UPDATE QUESTION
// =====================================

const updateQuestion = async (
  id,
  data
) => {
  const updateData =
    buildQuestionUpdate(
      data
    );

  if (
    Object.keys(updateData).length === 0
  ) {
    throw new ApiError(
      400,
      "No valid question fields were provided for update."
    );
  }

  const translationFields = [
    "question",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "explanation",
  ];

  const shouldTranslate =
    translationFields.some((field) =>
      Object.prototype.hasOwnProperty.call(
        updateData,
        field
      )
    );

  if (shouldTranslate) {
    const existingQuestion =
      await Question.findById(id).lean();

    if (!existingQuestion) {
      return null;
    }

    const questionForTranslation = {
      question:
        updateData.question ??
        existingQuestion.question,

      optionA:
        updateData.optionA ??
        existingQuestion.optionA,

      optionB:
        updateData.optionB ??
        existingQuestion.optionB,

      optionC:
        updateData.optionC ??
        existingQuestion.optionC,

      optionD:
        updateData.optionD ??
        existingQuestion.optionD,

      explanation:
        updateData.explanation ??
        existingQuestion.explanation,
    };

    const hindiTranslation =
      await safeTranslateQuestionToHindi(
        questionForTranslation
      );

    Object.assign(
      updateData,
      hindiTranslation
    );
  }

  return await Question.findByIdAndUpdate(
    id,
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
    }
  )
    .populate(
      "createdBy",
      "fullName email"
    )
    .lean();
};

// =====================================
// DELETE QUESTION
// =====================================

const deleteQuestion = async (
  id
) => {
  return await Question.findByIdAndDelete(
    id
  ).lean();
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionMetadata,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};