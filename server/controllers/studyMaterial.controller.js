const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  successResponse,
} = require("../utils/response");

const studyMaterialService = require(
  "../services/studyMaterial.service"
);

// =========================================
// ADMIN - LIST
// =========================================

exports.listAdmin = asyncHandler(
  async (req, res) => {
    const result =
      await studyMaterialService.getAdminStudyMaterials(
        {
          page: req.query.page,
          limit: req.query.limit,
          search: req.query.search,
          subject: req.query.subject,
          isPaid:
            req.query.isPaid === undefined
              ? undefined
              : req.query.isPaid ===
                  "true",
        }
      );

    return successResponse(
      res,
      200,
      "Study materials fetched successfully.",
      result
    );
  }
);

// =========================================
// ADMIN - CREATE
// =========================================

exports.create = asyncHandler(
  async (req, res) => {
    if (!req.file) {
      throw new ApiError(
        400,
        "Please select a PDF file."
      );
    }

    const result =
      await studyMaterialService.createStudyMaterial(
        {
          title: req.body.title,
          description:
            req.body.description,
          subject: req.body.subject,
          chapter: req.body.chapter,
          isPaid: req.body.isPaid,
          file: req.file,
          createdBy: req.user._id,
        }
      );

    return successResponse(
      res,
      201,
      "Study material uploaded successfully.",
      result
    );
  }
);

// =========================================
// ADMIN - DELETE
// =========================================

exports.remove = asyncHandler(
  async (req, res) => {
    const result =
      await studyMaterialService.deleteStudyMaterial(
        req.params.id
      );

    return successResponse(
      res,
      200,
      "Study material deleted successfully.",
      result
    );
  }
);

// =========================================
// STUDENT - LIST
// =========================================

exports.listStudent = asyncHandler(
  async (req, res) => {
    const result =
      await studyMaterialService.getStudentStudyMaterials(
        req.user._id,
        {
          page: req.query.page,
          limit: req.query.limit,
          search: req.query.search,
          subject: req.query.subject,
        }
      );

    return successResponse(
      res,
      200,
      "Study materials fetched successfully.",
      result
    );
  }
);

// =========================================
// STUDENT - ONE
// =========================================

exports.getStudentOne =
  asyncHandler(async (req, res) => {
    const result =
      await studyMaterialService.getStudentStudyMaterial(
        req.user._id,
        req.params.id
      );

    return successResponse(
      res,
      200,
      "Study material opened successfully.",
      result
    );
  });