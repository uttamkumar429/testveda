const express = require("express");

const router = express.Router();

const {
  protect,
} = require("../middleware/auth.middleware");

const authorize = require(
  "../middleware/role.middleware"
);

const upload = require(
  "../middleware/pdfUpload.middleware"
);

const controller = require(
  "../controllers/studyMaterial.controller"
);

// =========================================
// ADMIN - LIST
// =========================================

router.get(
  "/",
  protect,
  authorize("admin", "superAdmin"),
  controller.listAdmin
);

// =========================================
// ADMIN - UPLOAD
// =========================================

router.post(
  "/",
  protect,
  authorize("admin", "superAdmin"),
  upload.single("file"),
  controller.create
);

// =========================================
// ADMIN - DELETE
// =========================================

router.delete(
  "/:id",
  protect,
  authorize("admin", "superAdmin"),
  controller.remove
);

module.exports = router;