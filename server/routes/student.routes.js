const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const studentController = require("../controllers/student.controller");
/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Get Student Dashboard
 *     description: Returns upcoming, active, and completed exams for the logged-in student.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Access denied.
 */
// Student Dashboard
router.get(
  "/dashboard",
  protect,
  authorize("student"),
  studentController.getDashboard
);
/**
 * @swagger
 * /api/student/tests/{snapshotId}/start:
 *   post:
 *     summary: Start Exam
 *     description: Starts an exam attempt for the logged-in student.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: snapshotId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test Snapshot ID
 *     responses:
 *       200:
 *         description: Exam started successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Test snapshot not found.
 */
// Start Exam
router.post(
  "/tests/:snapshotId/start",
  protect,
  authorize("student"),
  studentController.startExam
);
/**
 * @swagger
 * /api/student/attempt/{attemptId}/questions:
 *   get:
 *     summary: Get Exam Questions
 *     description: Returns all questions for an active exam attempt.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam Attempt ID
 *     responses:
 *       200:
 *         description: Questions fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Exam attempt not found.
 */
// Get Exam Questions
router.get(
  "/attempt/:attemptId/questions",
  protect,
  authorize("student"),
  studentController.getExamQuestions
);
/**
 * @swagger
 * /api/student/attempt/{attemptId}/answer:
 *   post:
 *     summary: Save Answer
 *     description: Saves the selected answer for a question.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Answer saved successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 */
// Save Answer
router.post(

  "/attempt/:attemptId/answer",

  protect,

  authorize("student"),

  studentController.saveAnswer

);
/**
 * @swagger
 * /api/student/exam/resume:
 *   get:
 *     summary: Resume Running Exam
 *     description: Returns the currently running exam attempt for the logged-in student.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Running exam fetched successfully.
 *       404:
 *         description: No running exam found.
 *       401:
 *         description: Unauthorized.
 */
// Resume Running Exam
router.get(
  "/exam/resume",
  protect,
  authorize("student"),
  studentController.resumeExam
);

// =====================================
// UPDATE EXAM PROGRESS
// =====================================

router.patch(
  "/exams/:attemptId/progress",
  protect,
  authorize("student"),
  studentController.updateExamProgress
);
/**
 * @swagger
 * /api/student/attempt/{attemptId}/submit:
 *   post:
 *     summary: Submit Exam
 *     description: Submits the exam and calculates the result.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exam submitted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Exam attempt not found.
 */
// Submit Exam
router.post(
  "/attempt/:attemptId/submit",
  protect,
  authorize("student"),
  studentController.submitExam
);
/**
 * @swagger
 * /api/student/result/{attemptId}:
 *   get:
 *     summary: Get Result Details
 *     description: Returns detailed result of a submitted exam.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Result fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Result not found.
 */

// =====================================
// RESULT DETAILS
// =====================================

router.get(
  "/result/:attemptId",
  protect,
  authorize("student"),
  studentController.getResult
);
/**
 * @swagger
 * /api/student/results:
 *   get:
 *     summary: Get Result History
 *     description: Returns all previous exam results of the logged-in student.
 *     tags:
 *       - Student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Result history fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
// =====================================
// RESULT HISTORY
// =====================================

router.get(
  "/results",
  protect,
  authorize("student"),
  studentController.getResultHistory
);
router.get(
  "/exams",
  protect,
  authorize("student"),
  studentController.getAvailableExams
);
router.get(
  "/exams/:snapshotId/materials",
  protect,
  authorize("student"),
  require("../controllers/testMaterial.controller").getStudentMaterials
);
// =====================================
// REVIEW ANSWERS
// =====================================

router.get(
  "/result/:attemptId/review",
  protect,
  authorize("student"),
  studentController.getReviewAnswers
);
module.exports = router;