const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/pdfUpload.middleware");
const controller = require("../controllers/testMaterial.controller");

router.post(
  "/:id/materials",
  protect,
  authorize("admin", "superAdmin"),
  upload.single("file"),
  controller.upload
);

router.delete(
  "/:id/materials/:materialId",
  protect,
  authorize("admin", "superAdmin"),
  controller.remove
);

module.exports = router;
