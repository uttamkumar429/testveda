const express = require("express");

const router = express.Router();

const {
  protect,
} = require("../middleware/auth.middleware");

const authorize = require(
  "../middleware/role.middleware"
);

const controller = require(
  "../controllers/studyMaterial.controller"
);

// =========================================
// STUDENT - LIST
// =========================================

router.get(
  "/",
  protect,
  authorize("student"),
  controller.listStudent
);

// =========================================
// STUDENT - OPEN
// =========================================

router.get(
  "/:id",
  protect,
  authorize("student"),
  controller.getStudentOne
);

module.exports = router;