const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { successResponse } = require("../utils/response");
const Test = require("../models/Test");
const TestSnapshot = require("../models/TestSnapshot");
const {
  hasPremiumAccess,
} = require("../services/access.service");
const TestPurchase = require(
  "../models/TestPurchase"
);

exports.upload = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid test ID.");
  }

  if (!req.file) {
    throw new ApiError(400, "Please select a PDF file.");
  }

  const test = await Test.findById(id);

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  if (test.status !== "draft") {
    throw new ApiError(400, "Materials can only be added to a draft test.");
  }

  const title = String(req.body.title || req.file.originalname)
    .trim()
    .slice(0, 150);
  const description = String(req.body.description || "").trim().slice(0, 500);

  if (!title) {
    throw new ApiError(400, "Material title is required.");
  }

  const base64 = req.file.buffer.toString("base64");
  const uploaded = await cloudinary.uploader.upload(
    `data:${req.file.mimetype};base64,${base64}`,
    {
      folder: "testveda/test-materials",
      resource_type: "raw",
    }
  );

  test.materials.push({
    title,
    description,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    originalName: req.file.originalname,
    resourceType: "raw",
  });

  await test.save();

  return successResponse(
    res,
    201,
    "PDF uploaded successfully.",
    test.materials[test.materials.length - 1]
  );
});

exports.remove = asyncHandler(async (req, res) => {
  const { id, materialId } = req.params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(materialId)) {
    throw new ApiError(400, "Invalid material request.");
  }

  const test = await Test.findById(id);

  if (!test) {
    throw new ApiError(404, "Test not found.");
  }

  if (test.status !== "draft") {
    throw new ApiError(400, "Materials can only be removed from a draft test.");
  }

  const material = test.materials.id(materialId);

  if (!material) {
    throw new ApiError(404, "Material not found.");
  }

  try {
    await cloudinary.uploader.destroy(material.publicId, {
      resource_type: "raw",
    });
  } catch (error) {
    console.error("Cloudinary material delete failed:", error?.message || error);
  }

  material.deleteOne();
  await test.save();

  return successResponse(res, 200, "PDF removed successfully.");
});

exports.getStudentMaterials = asyncHandler(async (req, res) => {
  const { snapshotId } = req.params;

  if (!mongoose.isValidObjectId(snapshotId)) {
    throw new ApiError(400, "Invalid exam ID.");
  }

  const snapshot = await TestSnapshot.findById(snapshotId)
    .select("_id title isPaid price materials")
    .lean();

  if (!snapshot) {
    throw new ApiError(404, "Exam not found.");
  }

  if (snapshot.isPaid) {
    const purchase = await TestPurchase.findOne({
      student: req.user._id,
      testSnapshot: snapshotId,
      status: "PAID",
    }).select("_id").lean();

    if (!purchase) {
      throw new ApiError(403, "Purchase the test to access its study materials.");
    }
  }

  return successResponse(
    res,
    200,
    "Study materials fetched successfully.",
    {
      testSnapshotId: snapshot._id,
      title: snapshot.title,
      materials: (snapshot.materials || []).map((material) => ({
        _id: material._id,
        title: material.title,
        description: material.description,
        url: material.url,
        originalName: material.originalName,
      })),
    }
  );
});
