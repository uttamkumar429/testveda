const mongoose = require("mongoose");
const ExamAttempt = require("../models/ExamAttempt");
const TestSnapshot = require("../models/TestSnapshot");
const {
  getStudentAccessStatus,
  canAccessPremiumContent,
} = require("./access.service");
const StudentAnswer = require("../models/StudentAnswer");
const ApiError = require("../utils/ApiError");
const {
  SETTING_KEYS,
} = require("../config/constants");
const {
  getExamDeadline,
  getRemainingTimeSeconds,
} = require("../utils/examTime");
const {
  getNumberSetting,
} = require("./systemSetting.service");
const notificationService =
  require("./notification.service");
  const {
  translateExamQuestions,
} = require("./translation.service");
// ==========================================
// STUDENT DASHBOARD
// ==========================================
const getDashboard = async (studentId) => {
  const now = new Date();

  // ------------------------------------------
  // FIND SUBMITTED ATTEMPTS
  // ------------------------------------------

  const submittedAttempts = await ExamAttempt.find({
    student: studentId,
    status: "SUBMITTED",
  })
    .select(
      "_id testSnapshot obtainedMarks totalMarks percentage submittedAt"
    )
    .populate({
      path: "testSnapshot",
      select: "title subject",
    })
    .sort({ submittedAt: -1 })
    .limit(10)
    .lean();

  const submittedSnapshotIds = submittedAttempts
    .map((attempt) => attempt.testSnapshot?._id)
    .filter(Boolean);

  // ------------------------------------------
  // UPCOMING EXAMS
  // ------------------------------------------

  const upcomingQuery = {
    startTime: { $gt: now },
  };

  if (submittedSnapshotIds.length > 0) {
    upcomingQuery._id = {
      $nin: submittedSnapshotIds,
    };
  }

  // ------------------------------------------
  // ACTIVE EXAMS
  // ------------------------------------------

  const activeQuery = {
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (submittedSnapshotIds.length > 0) {
    activeQuery._id = {
      $nin: submittedSnapshotIds,
    };
  }

  // ------------------------------------------
  // DASHBOARD DATA
  // ------------------------------------------

  const [
    upcoming,
    active,
    upcomingCount,
    activeCount,
    completedCount,
    averageScoreData,
  ] = await Promise.all([
    TestSnapshot.find(upcomingQuery)
      .select(
        "_id title subject duration totalMarks totalQuestions startTime endTime isPaid price"
      )
      .sort({ startTime: 1 })
      .limit(5)
      .lean(),

    TestSnapshot.find(activeQuery)
      .select(
        "_id title subject duration totalMarks totalQuestions startTime endTime isPaid price"
      )
      .sort({ startTime: 1 })
      .limit(5)
      .lean(),

    TestSnapshot.countDocuments(upcomingQuery),

    TestSnapshot.countDocuments(activeQuery),

    ExamAttempt.countDocuments({
      student: studentId,
      status: "SUBMITTED",
    }),

    ExamAttempt.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          status: "SUBMITTED",
        },
      },
      {
        $group: {
          _id: null,
          averageScore: {
            $avg: "$percentage",
          },
        },
      },
    ]),
  ]);

  // ------------------------------------------
  // RECENT RESULTS
  // ------------------------------------------

  const recentResults = submittedAttempts
    .slice(0, 5)
    .map((attempt) => ({
      attemptId: attempt._id,

      examTitle:
        attempt.testSnapshot?.title ||
        "Unknown Exam",

      subject:
        attempt.testSnapshot?.subject ||
        "Unknown Subject",

      obtainedMarks:
        attempt.obtainedMarks || 0,

      totalMarks:
        attempt.totalMarks || 0,

      percentage:
        attempt.percentage || 0,

      submittedAt:
        attempt.submittedAt,
    }));

  // ------------------------------------------
  // PERFORMANCE
  // ------------------------------------------

  const performance = submittedAttempts
    .slice(0, 6)
    .reverse()
    .map((attempt) => ({
      exam:
        attempt.testSnapshot?.subject ||
        attempt.testSnapshot?.title ||
        "Exam",

      score:
        Number(attempt.percentage || 0),
    }));

  // ------------------------------------------
  // AVERAGE SCORE
  // ------------------------------------------

  const averageScore =
    averageScoreData.length > 0
      ? Number(
          Number(
            averageScoreData[0].averageScore || 0
          ).toFixed(2)
        )
      : 0;

  // ------------------------------------------
  // FINAL RESPONSE
  // ------------------------------------------

  return {
    stats: {
      availableExams:
        upcomingCount + activeCount,

      activeExams:
        activeCount,

      completedExams:
        completedCount,

      averageScore,
    },

    upcoming,

    active,

    recentResults,

    performance,
  };
};
/// ==========================================
// AVAILABLE EXAMS
// ==========================================

const getAvailableExams = async (studentId) => {
  // ----------------------------------------
  // 1. Validate Student ID
  // ----------------------------------------

  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  const now = new Date();

  // ----------------------------------------
  // 2. Find Already Submitted Exams
  // ----------------------------------------

  const submittedAttempts =
    await ExamAttempt.find({
      student: studentId,
      status: "SUBMITTED",
    })
      .select("testSnapshot")
      .lean();

  const submittedSnapshotIds =
    submittedAttempts
      .map(
        (attempt) => attempt.testSnapshot
      )
      .filter(Boolean);

  // ----------------------------------------
  // 3. Build Available Exam Query
  // ----------------------------------------

  const query = {
    endTime: {
      $gte: now,
    },
  };

  if (submittedSnapshotIds.length > 0) {
    query._id = {
      $nin: submittedSnapshotIds,
    };
  }

  // ----------------------------------------
  // 4. Fetch Available Exams
  // ----------------------------------------

  const exams =
    await TestSnapshot.find(query)
      .select(
        "_id title subject duration totalMarks totalQuestions startTime endTime isPaid price"
      )
      .sort({
        startTime: 1,
      })
      .lean();

  // ----------------------------------------
  // 5. Add Exam Status
  // ----------------------------------------

const accessStatus = await getStudentAccessStatus(studentId);

const examsWithAccess = exams.map((exam) => {
  const isFree = !exam.isPaid;

  const isPurchased =
    isFree ||
    accessStatus.premiumAccess;

  return {
    ...exam,

    status:
      exam.startTime <= now
        ? "ACTIVE"
        : "UPCOMING",

    isPurchased,

    accessStatus: isFree
      ? "FREE"
      : accessStatus.trial.active
        ? "TRIAL"
        : accessStatus.subscription
          ? "SUBSCRIPTION"
          : "SUBSCRIPTION_REQUIRED",

    trialActive: accessStatus.trial.active,

    trialEndDate: accessStatus.trial.trialEndDate,

    subscriptionActive:
      Boolean(accessStatus.subscription),

    subscriptionEndDate:
      accessStatus.subscription?.endDate || null,
  };
});

return examsWithAccess;
};
// ======================================
// START EXAM
// ======================================

const startExam = async (studentId, snapshotId) => {
  // --------------------------------------
  // 1. Validate IDs
  // --------------------------------------

  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  if (!mongoose.isValidObjectId(snapshotId)) {
    throw new ApiError(
      400,
      "Invalid exam ID."
    );
  }

  // --------------------------------------
  // 2. Find Test Snapshot
  // --------------------------------------

  const snapshot =
    await TestSnapshot.findById(snapshotId)
      .select(
        "_id title subject startTime endTime duration totalQuestions totalMarks questions isPaid price materials"
      )
      .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  // --------------------------------------
  // 3. Validate Exam Configuration
  // --------------------------------------

  if (
    !snapshot.startTime ||
    !snapshot.endTime ||
    !snapshot.duration
  ) {
    throw new ApiError(
      500,
      "Exam schedule is not configured correctly."
    );
  }

  if (
    !Array.isArray(snapshot.questions) ||
    snapshot.questions.length === 0
  ) {
    throw new ApiError(
      400,
      "This exam has no questions."
    );
  }

  // Paid exams require a verified purchase before an attempt can begin.
if (snapshot.isPaid) {
  const access = await getStudentAccessStatus(studentId);

  if (!access.premiumAccess) {
    throw new ApiError(
      403,
      "Your free trial has ended. Please subscribe to continue."
    );
  }
}

  // --------------------------------------
  // 4. Validate Snapshot Time Configuration
  // --------------------------------------

  const startTime =
    new Date(snapshot.startTime);

  const endTime =
    new Date(snapshot.endTime);

  const durationMinutes =
    Number(snapshot.duration);

  if (
    !Number.isFinite(
      startTime.getTime()
    ) ||
    !Number.isFinite(
      endTime.getTime()
    ) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new ApiError(
      500,
      "Exam schedule is invalid."
    );
  }

  if (endTime <= startTime) {
    throw new ApiError(
      500,
      "Exam end time must be after start time."
    );
  }

  // --------------------------------------
  // 5. Find Existing Attempt
  // --------------------------------------

  const existingAttempt =
    await ExamAttempt.findOne({
      student: studentId,
      testSnapshot: snapshotId,
    });

  // --------------------------------------
  // 6. Handle Existing Attempt
  // --------------------------------------

  if (existingAttempt) {
    // ------------------------------------
    // Existing Running Attempt
    // ------------------------------------

    if (
      existingAttempt.status ===
      "IN-PROGRESS"
    ) {
      // ----------------------------------
      // Calculate Server-Side Deadline
      // ----------------------------------

      const deadline =
        getExamDeadline({
          startedAt:
            existingAttempt.startedAt,
          endTime:
            snapshot.endTime,
          durationMinutes:
            snapshot.duration,
        });

      if (!deadline) {
        throw new ApiError(
          500,
          "Unable to determine exam deadline."
        );
      }

      // ----------------------------------
      // Check Expiry
      // ----------------------------------

      const now = new Date();

      if (now >= deadline) {
        await submitExam(
          studentId,
          existingAttempt._id
        );

        throw new ApiError(
          409,
          "Exam time is over. Your exam has been submitted automatically."
        );
      }

      // ----------------------------------
      // Calculate Remaining Time
      // ----------------------------------

      const remainingTime =
        getRemainingTimeSeconds(
          deadline,
          now
        );

      // ----------------------------------
      // Resume Existing Attempt
      // ----------------------------------

      return {
        attemptId:
          existingAttempt._id,

        testSnapshotId:
          existingAttempt.testSnapshot,

        title:
          snapshot.title,

        subject:
          snapshot.subject,

        totalQuestions:
          existingAttempt.totalQuestions,

        totalMarks:
          existingAttempt.totalMarks,

        status:
          existingAttempt.status,

        startedAt:
          existingAttempt.startedAt,

        currentQuestionIndex:
          existingAttempt.currentQuestionIndex,

        remainingTime,
      };
    }

    // ------------------------------------
    // Existing Submitted Attempt
    // ------------------------------------

    if (
      existingAttempt.status ===
      "SUBMITTED"
    ) {
      throw new ApiError(
        409,
        "Exam already submitted."
      );
    }

    // ------------------------------------
    // Unexpected Attempt Status
    // ------------------------------------

    throw new ApiError(
      500,
      "Invalid exam attempt status."
    );
  }

  // --------------------------------------
  // 7. Validate Exam Window
  //    Only for a NEW attempt
  // --------------------------------------

  const now = new Date();

  // Exam has not started
  if (now < startTime) {
    throw new ApiError(
      400,
      "Exam has not started yet."
    );
  }

  // Scheduled exam window ended
  if (now >= endTime) {
    throw new ApiError(
      409,
      "Exam has already ended."
    );
  }

  // --------------------------------------
  // 8. Calculate New Attempt Deadline
  // --------------------------------------

  const startedAt = new Date();

  const deadline =
    getExamDeadline({
      startedAt,
      endTime:
        snapshot.endTime,
      durationMinutes:
        snapshot.duration,
    });

  if (!deadline) {
    throw new ApiError(
      500,
      "Unable to determine exam deadline."
    );
  }

  // --------------------------------------
  // 9. Calculate Initial Remaining Time
  // --------------------------------------

  const remainingTime =
    getRemainingTimeSeconds(
      deadline,
      startedAt
    );

  if (remainingTime <= 0) {
    throw new ApiError(
      409,
      "Exam time is over."
    );
  }

  // --------------------------------------
  // 10. Create New Exam Attempt
  // --------------------------------------

  let attempt;

  try {
    attempt =
      await ExamAttempt.create({
        student: studentId,

        testSnapshot:
          snapshotId,

        startedAt,

        status:
          "IN-PROGRESS",

        currentQuestionIndex: 0,

        visitedQuestions: [],

        reviewQuestions: [],

        totalQuestions:
          snapshot.totalQuestions ??
          snapshot.questions.length,

        totalMarks:
          snapshot.totalMarks ?? 0,
      });
  } catch (error) {
    // ------------------------------------
    // Duplicate Attempt Protection
    // ------------------------------------

    if (error?.code === 11000) {
      throw new ApiError(
        409,
        "An exam attempt already exists for this test."
      );
    }

    throw error;
  }

  // --------------------------------------
  // 11. Return Safe Attempt Data
  // --------------------------------------

  return {
    attemptId:
      attempt._id,

    testSnapshotId:
      attempt.testSnapshot,

    title:
      snapshot.title,

    subject:
      snapshot.subject,

    totalQuestions:
      attempt.totalQuestions,

    totalMarks:
      attempt.totalMarks,

    status:
      attempt.status,

    startedAt:
      attempt.startedAt,

    currentQuestionIndex:
      attempt.currentQuestionIndex,

    remainingTime,
  };
};
// ======================================
// CHECK EXAM EXPIRY
// ======================================

const checkExamExpiry = async (
  studentId,
  attempt,
  snapshot
) => {

  // --------------------------------------
  // 1. Validate Attempt
  // --------------------------------------

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // --------------------------------------
  // 2. Validate Snapshot
  // --------------------------------------

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 3. Verify Ownership
  // --------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to access this exam."
    );
  }

  // --------------------------------------
  // 4. Already Submitted
  // --------------------------------------

  if (attempt.status === "SUBMITTED") {
    throw new ApiError(
      409,
      "Exam already submitted."
    );
  }

  // --------------------------------------
  // 5. Calculate Server-Side Deadline
  // --------------------------------------

  const deadline = getExamDeadline({
    startedAt: attempt.startedAt,
    endTime: snapshot.endTime,
    durationMinutes: snapshot.duration,
  });

  if (!deadline) {
    throw new ApiError(
      500,
      "Unable to determine exam deadline."
    );
  }

  // --------------------------------------
  // 6. Check Server Time
  // --------------------------------------

  if (new Date() < deadline) {
    return deadline;
  }

  // --------------------------------------
  // 7. Auto Submit
  // --------------------------------------

  await submitExam(
    studentId,
    attempt._id
  );

  // --------------------------------------
  // 8. Inform Caller
  // --------------------------------------

  throw new ApiError(
    409,
    "Exam time is over. Your exam has been submitted automatically."
  );
};



// =====================================
// GET EXAM QUESTIONS
// =====================================

const getExamQuestions = async (
  studentId,
  attemptId,
  language = "english"
) => {
  // -------------------------------------
  // 1. Find Exam Attempt
  // -------------------------------------

  const attempt = await ExamAttempt.findById(
    attemptId
  ).select(
    "student status testSnapshot startedAt currentQuestionIndex visitedQuestions reviewQuestions"
  );

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // -------------------------------------
  // 2. Verify Student Ownership
  // -------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to access this exam."
    );
  }

  // -------------------------------------
  // 3. Verify Attempt Status
  // -------------------------------------

  if (attempt.status === "SUBMITTED") {
    throw new ApiError(
      409,
      "Exam already submitted."
    );
  }

  if (attempt.status !== "IN-PROGRESS") {
    throw new ApiError(
      409,
      "Exam is not currently active."
    );
  }

  // -------------------------------------
  // 4. Load Test Snapshot
  // -------------------------------------

  const snapshot = await TestSnapshot.findById(
    attempt.testSnapshot
  )
    .select(
      "_id title subject duration totalQuestions totalMarks startTime endTime questions"
    )
    .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // -------------------------------------
  // 5. Check Exam Expiry
  // -------------------------------------

  const deadline = await checkExamExpiry(
    studentId,
    attempt,
    snapshot
  );

  // -------------------------------------
  // 6. Calculate Remaining Time
  // -------------------------------------

  const remainingTime =
    getRemainingTimeSeconds(deadline);

  // -------------------------------------
  // 7. Load Saved Answers
  // -------------------------------------

  const savedAnswers =
    await StudentAnswer.find({
      attempt: attempt._id,
    })
      .select(
        "questionId selectedAnswer"
      )
      .lean();

  // -------------------------------------
  // 8. Build Selected Answers Map
  // -------------------------------------

const selectedAnswers = {};

for (const answer of savedAnswers) {
  if (
    answer.selectedAnswer !== null &&
    answer.selectedAnswer !== undefined
  ) {
    selectedAnswers[
      answer.questionId.toString()
    ] = answer.selectedAnswer;
  }
}
  // -------------------------------------
  // 9. Prepare Secure Questions
  // -------------------------------------
  // IMPORTANT:
  // Never return correctAnswer/isCorrect
  // to the student during the exam.

  const questions = snapshot.questions.map(
  (question) => ({
    questionId: question.questionId,

    subject: question.subject,

    chapter: question.chapter,

    difficulty: question.difficulty,

    // ENGLISH
    questionText: question.question,

    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,

    // HINDI
    questionHindi:
      question.questionHindi || "",

    optionAHindi:
      question.optionAHindi || "",

    optionBHindi:
      question.optionBHindi || "",

    optionCHindi:
      question.optionCHindi || "",

    optionDHindi:
      question.optionDHindi || "",

    questionImage:
      question.questionImage || null,

    marks: question.marks,
  })
);
  // -------------------------------------
  // 10. Return Exam Data
  // -------------------------------------

  return {
    attemptId: attempt._id,

    testSnapshotId: snapshot._id,

    title: snapshot.title,

    subject: snapshot.subject,

    questions,

    selectedAnswers,

    currentQuestionIndex:
      attempt.currentQuestionIndex,

    visitedQuestions:
      attempt.visitedQuestions,

    reviewQuestions:
      attempt.reviewQuestions,

    remainingTime,

    totalQuestions:
      snapshot.totalQuestions,

    totalMarks:
      snapshot.totalMarks,
  };
};


// ======================================
// SAVE ANSWER
// ======================================

const saveAnswer = async (
  studentId,
  attemptId,
  questionId,
  selectedAnswer,
  currentQuestionIndex,
  timeSpent = 0
) => {
  // --------------------------------------
  // 1. Find Exam Attempt
  // --------------------------------------

  const attempt = await ExamAttempt.findById(
    attemptId
  );

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // --------------------------------------
  // 2. Verify Student Ownership
  // --------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to access this exam."
    );
  }

  // --------------------------------------
  // 3. Check Submission Status
  // --------------------------------------

  if (attempt.status === "SUBMITTED") {
    throw new ApiError(
      409,
      "Exam already submitted."
    );
  }

  // --------------------------------------
  // 4. Load Test Snapshot
  // --------------------------------------

  const snapshot = await TestSnapshot.findById(
    attempt.testSnapshot
  ).lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 5. Check Exam Expiry
  // --------------------------------------

  const deadline = getExamDeadline({
    startedAt: attempt.startedAt,
    endTime: snapshot.endTime,
    durationMinutes: snapshot.duration,
  });

  if (!deadline) {
    throw new ApiError(
      500,
      "Unable to determine exam deadline."
    );
  }

  if (new Date() >= deadline) {
    await submitExam(
      studentId,
      attempt._id
    );

    throw new ApiError(
      409,
      "Exam time is over. Your exam has been submitted automatically."
    );
  }

  // --------------------------------------
  // 6. Validate Question Index
  // --------------------------------------

  if (
    !Number.isInteger(currentQuestionIndex) ||
    currentQuestionIndex < 0 ||
    currentQuestionIndex >=
      snapshot.questions.length
  ) {
    throw new ApiError(
      400,
      "Invalid question index."
    );
  }

  // --------------------------------------
  // 7. Validate Question ID
  // --------------------------------------

  if (
    !mongoose.isValidObjectId(questionId)
  ) {
    throw new ApiError(
      400,
      "Invalid question ID."
    );
  }

  // --------------------------------------
  // 8. Validate Selected Answer
  // --------------------------------------

  if (
    selectedAnswer !== null &&
    !["A", "B", "C", "D"].includes(
      selectedAnswer
    )
  ) {
    throw new ApiError(
      400,
      "Invalid selected answer."
    );
  }

  // --------------------------------------
  // 9. Find Question in Snapshot
  // --------------------------------------

  const question = snapshot.questions.find(
    (item) =>
      item.questionId.toString() ===
      questionId.toString()
  );

  if (!question) {
    throw new ApiError(
      404,
      "Question not found in this exam."
    );
  }

// --------------------------------------
// 10. Calculate Answer Result
// --------------------------------------

const isAnswered =
  selectedAnswer !== null;

const isCorrect =
  isAnswered &&
  question.correctAnswer ===
    selectedAnswer;

const marksAwarded =
  isCorrect
    ? Number(question.marks || 0)
    : 0;

  // --------------------------------------
// 10.1 Validate Time Spent
// --------------------------------------

const safeTimeSpent = Math.max(
  0,
  Number(timeSpent) || 0
);

  // --------------------------------------
  // 11. Create / Update Student Answer
  // --------------------------------------

  const savedAnswer =
    await StudentAnswer.findOneAndUpdate(
      {
        attempt: attempt._id,
        questionId,
      },
      {
        $set: {
          selectedAnswer,
          correctAnswer:
            question.correctAnswer,
          isCorrect,
          marksAwarded,
          answeredAt:
            selectedAnswer !== null
              ? new Date()
              : null,
        },

        $inc: {
          timeSpent: safeTimeSpent,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

  // --------------------------------------
  // 12. Update Exam Progress
  // --------------------------------------

  attempt.currentQuestionIndex =
    currentQuestionIndex;

  const alreadyVisited =
    attempt.visitedQuestions.some(
      (id) =>
        id.toString() ===
        questionId.toString()
    );

  if (!alreadyVisited) {
    attempt.visitedQuestions.push(
      questionId
    );
  }

  await attempt.save();

  // --------------------------------------
  // 13. Return Saved Answer
  // --------------------------------------

  return savedAnswer;
};

// ======================================
// RESUME EXAM
// ======================================

const resumeExam = async (studentId) => {
  // --------------------------------------
  // 1. Find Running Attempt
  // --------------------------------------

  const attempt = await ExamAttempt.findOne({
    student: studentId,
    status: "IN-PROGRESS",
  }).select(
    "student _id totalQuestions totalMarks status testSnapshot startedAt currentQuestionIndex visitedQuestions reviewQuestions"
  );

  if (!attempt) {
    throw new ApiError(
      404,
      "No running exam found."
    );
  }

  // --------------------------------------
  // 2. Load Test Snapshot
  // --------------------------------------

  const snapshot = await TestSnapshot.findById(
    attempt.testSnapshot
  )
    .select(
      "_id title subject duration totalQuestions totalMarks endTime"
    )
    .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 3. Check Exam Expiry
  // --------------------------------------

  const deadline = await checkExamExpiry(
    studentId,
    attempt,
    snapshot
  );

  // --------------------------------------
  // 4. Calculate Remaining Time
  // --------------------------------------

  const remainingTime =
    getRemainingTimeSeconds(deadline);

  // --------------------------------------
  // 5. Load Saved Answers
  // --------------------------------------

  const savedAnswers =
    await StudentAnswer.find({
      attempt: attempt._id,
    })
      .select(
        "questionId selectedAnswer"
      )
      .lean();

  // --------------------------------------
  // 6. Build Selected Answers Map
  // --------------------------------------

  const selectedAnswers = {};

  for (const answer of savedAnswers) {
    selectedAnswers[
      answer.questionId.toString()
    ] = answer.selectedAnswer;
  }

// --------------------------------------
// 7. Count Answered Questions
// --------------------------------------

const answeredQuestions =
  savedAnswers.filter(
    (answer) =>
      answer.selectedAnswer !== null &&
      answer.selectedAnswer !== undefined
  ).length;
  // --------------------------------------
  // 8. Return Resume State
  // --------------------------------------

  return {
    attemptId: attempt._id,

    testSnapshotId: snapshot._id,

    title: snapshot.title,

    subject: snapshot.subject,

    totalQuestions:
      attempt.totalQuestions,

    totalMarks:
      attempt.totalMarks,
    answeredQuestions,

    selectedAnswers,

    currentQuestionIndex:
      attempt.currentQuestionIndex,

    visitedQuestions:
      attempt.visitedQuestions,

    reviewQuestions:
      attempt.reviewQuestions,

    remainingTime,

    status: attempt.status,
  };
};

// ======================================
// UPDATE EXAM PROGRESS
// ======================================

const updateExamProgress = async (
  studentId,
  attemptId,
  {
    currentQuestionIndex,
    visitedQuestions = [],
    reviewQuestions = [],
  }
) => {

  // --------------------------------------
  // 1. Validate IDs
  // --------------------------------------

  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  if (!mongoose.isValidObjectId(attemptId)) {
    throw new ApiError(
      400,
      "Invalid exam attempt ID."
    );
  }

  // --------------------------------------
  // 2. Validate Current Question Index
  // --------------------------------------

  if (
    !Number.isInteger(
      currentQuestionIndex
    ) ||
    currentQuestionIndex < 0
  ) {
    throw new ApiError(
      400,
      "Invalid current question index."
    );
  }

  // --------------------------------------
  // 3. Validate Arrays
  // --------------------------------------

  if (
    !Array.isArray(visitedQuestions) ||
    !Array.isArray(reviewQuestions)
  ) {
    throw new ApiError(
      400,
      "Visited and review questions must be arrays."
    );
  }

  // --------------------------------------
  // 4. Find Attempt
  // --------------------------------------

  const attempt =
    await ExamAttempt.findById(
      attemptId
    );

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // --------------------------------------
  // 5. Ownership Check
  // --------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to update this exam."
    );
  }

  // --------------------------------------
  // 6. Check Attempt Status
  // --------------------------------------

  if (
    attempt.status === "SUBMITTED"
  ) {
    throw new ApiError(
      409,
      "Exam already submitted."
    );
  }

  if (
    attempt.status !== "IN-PROGRESS"
  ) {
    throw new ApiError(
      409,
      "Exam is not currently active."
    );
  }

  // --------------------------------------
  // 7. Load Snapshot
  // --------------------------------------

  const snapshot =
    await TestSnapshot.findById(
      attempt.testSnapshot
    )
      .select(
        "questions totalQuestions"
      )
      .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 8. Validate Question Index
  // --------------------------------------

  if (
    currentQuestionIndex >=
    snapshot.questions.length
  ) {
    throw new ApiError(
      400,
      "Invalid current question index."
    );
  }

  // --------------------------------------
  // 9. Build Valid Question ID Set
  // --------------------------------------

  const validQuestionIds =
    new Set(
      snapshot.questions.map(
        (question) =>
          question.questionId.toString()
      )
    );

  // --------------------------------------
  // 10. Validate Visited Questions
  // --------------------------------------

  const normalizedVisitedQuestions =
    [
      ...new Set(visitedQuestions)
    ].map((id) => {

      if (
        !mongoose.isValidObjectId(id)
      ) {
        throw new ApiError(
          400,
          `Invalid visited question ID: ${id}`
        );
      }

      if (
        !validQuestionIds.has(
          id.toString()
        )
      ) {
        throw new ApiError(
          400,
          "Visited question does not belong to this exam."
        );
      }

      return id;
    });

  // --------------------------------------
  // 11. Validate Review Questions
  // --------------------------------------

  const normalizedReviewQuestions =
    [
      ...new Set(reviewQuestions)
    ].map((id) => {

      if (
        !mongoose.isValidObjectId(id)
      ) {
        throw new ApiError(
          400,
          `Invalid review question ID: ${id}`
        );
      }

      if (
        !validQuestionIds.has(
          id.toString()
        )
      ) {
        throw new ApiError(
          400,
          "Review question does not belong to this exam."
        );
      }

      return id;
    });

  // --------------------------------------
  // 12. Update Progress
  // --------------------------------------

  attempt.currentQuestionIndex =
    currentQuestionIndex;

  attempt.visitedQuestions =
    normalizedVisitedQuestions;

  attempt.reviewQuestions =
    normalizedReviewQuestions;

  await attempt.save();

  // --------------------------------------
  // 13. Return Safe Response
  // --------------------------------------

  return {
    attemptId: attempt._id,
    currentQuestionIndex:
      attempt.currentQuestionIndex,
    visitedQuestions:
      attempt.visitedQuestions,
    reviewQuestions:
      attempt.reviewQuestions,
  };
};

// ======================================
// SUBMIT EXAM
// ======================================

const submitExam = async (studentId, attemptId) => {
  // --------------------------------------
  // 1. Find Exam Attempt
  // --------------------------------------

  const attempt = await ExamAttempt.findById(attemptId);

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // --------------------------------------
  // 2. Verify Student Ownership
  // --------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to submit this exam."
    );
  }

// --------------------------------------
// 3. Check Submission Status
// --------------------------------------

if (attempt.status === "SUBMITTED") {
  throw new ApiError(
    409,
    "Exam already submitted."
  );
}

if (attempt.status !== "IN-PROGRESS") {
  throw new ApiError(
    409,
    "Exam is not currently active."
  );
}

  // --------------------------------------
  // 4. Load Test Snapshot
  // --------------------------------------

  const snapshot = await TestSnapshot.findById(
    attempt.testSnapshot
  )
    .select(
      "_id duration endTime totalQuestions totalMarks"
    )
    .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 5. Calculate Exam Deadline
  // --------------------------------------

  const deadline = getExamDeadline({
    startedAt: attempt.startedAt,
    endTime: snapshot.endTime,
    durationMinutes: snapshot.duration,
  });

  if (!deadline) {
    throw new ApiError(
      500,
      "Unable to determine exam deadline."
    );
  }

  // --------------------------------------
  // 6. Load Student Answers
  // --------------------------------------

  const answers = await StudentAnswer.find({
    attempt: attempt._id,
  })
    .select(
      "selectedAnswer isCorrect marksAwarded"
    )
    .lean();

  // --------------------------------------
  // 7. Calculate Exam Result
  // --------------------------------------

  let obtainedMarks = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  for (const answer of answers) {
    obtainedMarks += Number(
      answer.marksAwarded || 0
    );

    if (answer.isCorrect === true) {
      correctAnswers++;
    } else if (
      answer.selectedAnswer !== null &&
      answer.selectedAnswer !== undefined
    ) {
      wrongAnswers++;
    }
  }

  // --------------------------------------
  // 8. Calculate Question Statistics
  // --------------------------------------

  const totalQuestions =
    Number(snapshot.totalQuestions || 0);

  const totalMarks =
    Number(snapshot.totalMarks || 0);


  const answeredQuestions = answers.filter(
  (answer) =>
    ["A", "B", "C", "D"].includes(
      answer.selectedAnswer
    )
).length;

  const unansweredQuestions = Math.max(
    totalQuestions - answeredQuestions,
    0
  );

  // --------------------------------------
  // 9. Calculate Percentage
  // --------------------------------------

  const percentage =
    totalMarks > 0
      ? Number(
          (
            (obtainedMarks / totalMarks) *
            100
          ).toFixed(2)
        )
      : 0;

// --------------------------------------
// 10. Calculate Pass / Fail
// --------------------------------------

const passPercentage =
  await getNumberSetting(
    SETTING_KEYS.PASS_PERCENTAGE
  );

const isPassed =
  percentage >= passPercentage;
  // --------------------------------------
  // 11. Calculate Time Taken
  // --------------------------------------

  const submittedAt = new Date();

  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      (
        submittedAt.getTime() -
        attempt.startedAt.getTime()
      ) / 1000
    )
  );

  const allowedDurationSeconds = Math.max(
    0,
    Math.floor(
      (
        deadline.getTime() -
        attempt.startedAt.getTime()
      ) / 1000
    )
  );

  const timeTaken = Math.min(
    elapsedSeconds,
    allowedDurationSeconds
  );
// --------------------------------------
// 12. Atomically Submit Exam
// --------------------------------------

const submittedAttempt =
  await ExamAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: "IN-PROGRESS",
    },
    {
      $set: {
        totalQuestions,
        totalMarks,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        obtainedMarks,
        percentage,
        isPassed,
        timeTaken,
        submittedAt,
        status: "SUBMITTED",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );


// --------------------------------------
// 13. Verify Submission
// --------------------------------------

if (!submittedAttempt) {
  throw new ApiError(
    409,
    "Exam has already been submitted."
  );
}

// --------------------------------------
// 14. Create Result Notification
// --------------------------------------

try {
  await notificationService.createNotification({
    studentId,

    type: "RESULT",

    title: "Result Declared",

    message: `Your result has been declared. You scored ${percentage}% and ${
      isPassed ? "passed" : "failed"
    } the exam.`,

    relatedId:
      submittedAttempt._id,

    relatedModel:
      "ExamAttempt",

    actionUrl:
      `/student/result/${submittedAttempt._id}`,
  });
} catch (notificationError) {
  // Result submission must not fail because
  // notification delivery failed.
  console.error(
    "Result Notification Error:",
    notificationError
  );
}
  // --------------------------------------
  // 15. Return Result
  // --------------------------------------

  return {

    attemptId: submittedAttempt._id,
    status: submittedAttempt.status,

    totalQuestions,
    answeredQuestions,

    correctAnswers,
    wrongAnswers,
    unansweredQuestions,

    obtainedMarks,
    totalMarks,

    percentage,
    isPassed,

    timeTaken,
    submittedAt,
  };
};
// ======================================
// GET RESULT
// ======================================

const getResult = async (
  studentId,
  attemptId
) => {
  // --------------------------------------
  // 1. Find Exam Attempt
  // --------------------------------------

  const attempt =
    await ExamAttempt.findById(attemptId)
      .select(
        [
          "student",
          "testSnapshot",
          "status",
          "totalQuestions",
          "totalMarks",
          "correctAnswers",
          "wrongAnswers",
          "unansweredQuestions",
          "obtainedMarks",
          "percentage",
          "isPassed",
          "timeTaken",
          "submittedAt",
        ].join(" ")
      )
      .lean();

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // --------------------------------------
  // 2. Ownership / Security Check
  // --------------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to view this result."
    );
  }

  // --------------------------------------
  // 3. Result Must Be Submitted
  // --------------------------------------

  if (attempt.status !== "SUBMITTED") {
    throw new ApiError(
      400,
      "Exam is not submitted yet."
    );
  }

  // --------------------------------------
  // 4. Load Test Snapshot
  // --------------------------------------

  const snapshot =
    await TestSnapshot.findById(
      attempt.testSnapshot
    )
      .select("_id title subject")
      .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // --------------------------------------
  // 5. Return Finalized Result
  // --------------------------------------

  return {
    attemptId: attempt._id,

    examTitle: snapshot.title,

    subject: snapshot.subject,

    totalQuestions:
      attempt.totalQuestions,

    answeredQuestions: Math.max(
      0,
      attempt.totalQuestions -
        attempt.unansweredQuestions
    ),

    correctAnswers:
      attempt.correctAnswers,

    wrongAnswers:
      attempt.wrongAnswers,

    skippedAnswers:
      attempt.unansweredQuestions,

    obtainedMarks:
      attempt.obtainedMarks,

    totalMarks:
      attempt.totalMarks,

    percentage:
      attempt.percentage,

    status:
      attempt.isPassed
        ? "Pass"
        : "Fail",

    timeTaken:
      attempt.timeTaken,

    submittedAt:
      attempt.submittedAt,
  };
};
// ======================================
// GET RESULT HISTORY
// ======================================
const getResultHistory = async (studentId) => {

  // Load Submitted Attempts
  const attempts = await ExamAttempt.find({
    student: studentId,
    status: "SUBMITTED",
  })
    .populate({
      path: "testSnapshot",
      select: "title subject",
    })
    .sort({ submittedAt: -1 })
    .lean();

  const results = attempts.map((attempt) => ({
    attemptId: attempt._id,
    examTitle: attempt.testSnapshot?.title || "Unknown Test",
    totalQuestions: attempt.totalQuestions,
    subject: attempt.testSnapshot?.subject || "Unknown Subject",
    obtainedMarks: attempt.obtainedMarks,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    
    status:
      attempt.isPassed
        ? "Pass"
        : "Fail",
    submittedAt: attempt.submittedAt,
  }));

  return results;
};

// ======================================================
// GET REVIEW ANSWERS
// ======================================================

const getReviewAnswers = async (
  studentId,
  attemptId
) => {
  // ----------------------------------
  // 1. Find Attempt
  // ----------------------------------

  const attempt =
    await ExamAttempt.findById(attemptId)
      .select(
        [
          "student",
          "testSnapshot",
          "status",
          "obtainedMarks",
          "totalMarks",
          "percentage",
          "isPassed",
          "totalQuestions",
          "submittedAt",
          "timeTaken",
        ].join(" ")
      )
      .lean();

  if (!attempt) {
    throw new ApiError(
      404,
      "Exam attempt not found."
    );
  }

  // ----------------------------------
  // 2. Verify Student Ownership
  // ----------------------------------

  if (
    attempt.student.toString() !==
    studentId.toString()
  ) {
    throw new ApiError(
      403,
      "You are not allowed to access this review."
    );
  }

  // ----------------------------------
  // 3. Review Available Only After Submission
  // ----------------------------------

  if (attempt.status !== "SUBMITTED") {
    throw new ApiError(
      400,
      "Please submit the exam first."
    );
  }

  // ----------------------------------
  // 4. Load Required Snapshot Data
  // ----------------------------------

  const snapshot =
    await TestSnapshot.findById(
      attempt.testSnapshot
    )
      .select(
        "title subject questions"
      )
      .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test snapshot not found."
    );
  }

  // ----------------------------------
  // 5. Load Student Answers
  // ----------------------------------

  const answers =
    await StudentAnswer.find({
      attempt: attemptId,
    })
    .select(
      "questionId selectedAnswer isCorrect marksAwarded timeSpent"
    )
      .lean();

  // ----------------------------------
  // 6. Create O(1) Answer Lookup
  // ----------------------------------

  const answerMap = new Map();

  for (const answer of answers) {
    answerMap.set(
      answer.questionId.toString(),
      answer
    );
  }

// ----------------------------------
// 7. Build Review Questions
// ----------------------------------

const reviewQuestions =
  snapshot.questions.map(
    (question, index) => {
      const questionId =
        question.questionId.toString();

      const studentAnswer =
        answerMap.get(questionId);

      return {
        questionId:
          question.questionId,

        questionNumber:
          index + 1,

        subject:
          question.subject,

        chapter:
          question.chapter,

        difficulty:
          question.difficulty,

        // ==================================
        // ENGLISH + HINDI QUESTION
        // ==================================

        question:
          question.question,

        questionHindi:
          question.questionHindi || "",

        marks:
          question.marks,

        // ==================================
        // OPTIONS
        // ==================================

        options: [
          {
            value: "A",
            text: question.optionA,
            textHindi:
              question.optionAHindi || "",
          },
          {
            value: "B",
            text: question.optionB,
            textHindi:
              question.optionBHindi || "",
          },
          {
            value: "C",
            text: question.optionC,
            textHindi:
              question.optionCHindi || "",
          },
          {
            value: "D",
            text: question.optionD,
            textHindi:
              question.optionDHindi || "",
          },
        ],

        // ==================================
        // STUDENT ANSWER
        // ==================================

        selectedAnswer:
          studentAnswer?.selectedAnswer ??
          null,

        correctAnswer:
          question.correctAnswer,

        isCorrect:
          studentAnswer?.isCorrect ??
          false,

        marksAwarded:
          studentAnswer?.marksAwarded ??
          0,

        timeSpent:
          studentAnswer?.timeSpent ??
          0,

        // ==================================
        // EXPLANATION
        // ==================================

        explanation:
          question.explanation || "",

        explanationHindi:
          question.explanationHindi || "",
      };
    }
  );
    const status =
      attempt.isPassed
        ? "Pass"
        : "Fail";


  // ----------------------------------
  // 8. Final Response
  // ----------------------------------

  return {
    attemptId: attempt._id,

    examTitle: snapshot.title,

    subject: snapshot.subject,

    obtainedMarks: attempt.obtainedMarks,

    totalMarks: attempt.totalMarks,

    percentage: attempt.percentage,

    status,

    totalQuestions: attempt.totalQuestions,

    timeTaken: attempt.timeTaken,

    submittedAt: attempt.submittedAt,

    questions: reviewQuestions,
  };
};
module.exports = {
  getDashboard,
  getAvailableExams,
  startExam,
  getExamQuestions,
  saveAnswer,
  resumeExam,
  updateExamProgress,
  submitExam,
  getResult,
  getResultHistory,
  getReviewAnswers,
};