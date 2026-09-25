const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const questionController = require("../controllers/question.controller");
const validate = require("../middleware/validation.middleware");
const validateQuestion = require("../validators/question.validator");

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Create Question
 *     description: Creates a new question in the question bank with manually entered English and Hindi content.
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - chapter
 *               - question
 *               - optionA
 *               - optionB
 *               - optionC
 *               - optionD
 *               - questionHindi
 *               - optionAHindi
 *               - optionBHindi
 *               - optionCHindi
 *               - optionDHindi
 *               - correctAnswer
 *               - marks
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Physics
 *               chapter:
 *                 type: string
 *                 example: Magnetism
 *               question:
 *                 type: string
 *                 example: What is the SI unit of magnetic field?
 *               optionA:
 *                 type: string
 *                 example: Tesla
 *               optionB:
 *                 type: string
 *                 example: Weber
 *               optionC:
 *                 type: string
 *                 example: Henry
 *               optionD:
 *                 type: string
 *                 example: Volt
 *               questionHindi:
 *                 type: string
 *                 example: चुंबकीय क्षेत्र की SI इकाई क्या है?
 *               optionAHindi:
 *                 type: string
 *                 example: टेस्ला
 *               optionBHindi:
 *                 type: string
 *                 example: वेबर
 *               optionCHindi:
 *                 type: string
 *                 example: हेनरी
 *               optionDHindi:
 *                 type: string
 *                 example: वोल्ट
 *               correctAnswer:
 *                 type: string
 *                 enum:
 *                   - A
 *                   - B
 *                   - C
 *                   - D
 *                 example: A
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - Easy
 *                   - Medium
 *                   - Hard
 *                 example: Medium
 *               marks:
 *                 type: number
 *                 example: 5
 *               explanation:
 *                 type: string
 *                 example: The SI unit of magnetic field is Tesla.
 *               explanationHindi:
 *                 type: string
 *                 example: चुंबकीय क्षेत्र की SI इकाई टेस्ला है।
 *     responses:
 *       201:
 *         description: Question created successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 */

// Create Question
router.post(
  "/",
  protect,
  authorize("admin", "superAdmin"),
  validate(validateQuestion),
  questionController.createQuestion
);

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Get All Questions
 *     description: Returns all questions from the question bank.
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Questions fetched successfully.
 *       401:
 *         description: Unauthorized.
 */

// Get All Questions
router.get(
  "/",
  protect,
  authorize("admin", "superAdmin"),
  questionController.getAllQuestions
);

// ======================================
// GET QUESTION FILTER METADATA
// ======================================

router.get(
  "/metadata",
  protect,
  authorize("admin", "superAdmin"),
  questionController.getQuestionMetadata
);

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Get Question By ID
 *     description: Returns details of a specific question, including manually entered English and Hindi content.
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question not found.
 */

// Get Question By Id
router.get(
  "/:id",
  protect,
  authorize("admin", "superAdmin"),
  questionController.getQuestionById
);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Update Question
 *     description: Updates an existing question including its manually entered English and Hindi content.
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - chapter
 *               - question
 *               - optionA
 *               - optionB
 *               - optionC
 *               - optionD
 *               - questionHindi
 *               - optionAHindi
 *               - optionBHindi
 *               - optionCHindi
 *               - optionDHindi
 *               - correctAnswer
 *               - marks
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Physics
 *               chapter:
 *                 type: string
 *                 example: Magnetism
 *               question:
 *                 type: string
 *                 example: What is the SI unit of magnetic field?
 *               optionA:
 *                 type: string
 *                 example: Tesla
 *               optionB:
 *                 type: string
 *                 example: Weber
 *               optionC:
 *                 type: string
 *                 example: Henry
 *               optionD:
 *                 type: string
 *                 example: Volt
 *               questionHindi:
 *                 type: string
 *                 example: चुंबकीय क्षेत्र की SI इकाई क्या है?
 *               optionAHindi:
 *                 type: string
 *                 example: टेस्ला
 *               optionBHindi:
 *                 type: string
 *                 example: वेबर
 *               optionCHindi:
 *                 type: string
 *                 example: हेनरी
 *               optionDHindi:
 *                 type: string
 *                 example: वोल्ट
 *               correctAnswer:
 *                 type: string
 *                 enum:
 *                   - A
 *                   - B
 *                   - C
 *                   - D
 *                 example: A
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - Easy
 *                   - Medium
 *                   - Hard
 *                 example: Medium
 *               marks:
 *                 type: number
 *                 example: 5
 *               explanation:
 *                 type: string
 *                 example: The SI unit of magnetic field is Tesla.
 *               explanationHindi:
 *                 type: string
 *                 example: चुंबकीय क्षेत्र की SI इकाई टेस्ला है।
 *     responses:
 *       200:
 *         description: Question updated successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question not found.
 */

// Update Question
router.put(
  "/:id",
  protect,
  authorize("admin", "superAdmin"),
  validate(validateQuestion),
  questionController.updateQuestion
);

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     summary: Delete Question
 *     description: Deletes a question from the question bank.
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question not found.
 */

// Delete Question
router.delete(
  "/:id",
  protect,
  authorize("admin", "superAdmin"),
  questionController.deleteQuestion
);

module.exports = router;