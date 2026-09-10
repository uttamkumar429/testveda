const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

const StudyMaterial = require("../models/StudyMaterial");
const ApiError = require("../utils/ApiError");
const {
  getStudentAccessStatus,
} = require("./access.service");

// =========================================
// CONSTANTS
// =========================================

const CLOUDINARY_FOLDER =
  "testveda/study-materials";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

// =========================================
// HELPERS
// =========================================

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeString = (
  value,
  maxLength
) => {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
};

const uploadPdfBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER,
          resource_type: "raw",
          type: "authenticated",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    uploadStream.end(file.buffer);
  });
};

const deleteCloudinaryPdf = async (
  publicId
) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "raw",
        type: "authenticated",
      }
    );
  } catch (error) {
    console.error(
      "Study material Cloudinary delete failed:",
      error?.message || error
    );
  }
};

const generateSignedPdfUrl = (
  publicId
) => {
  if (!publicId) {
    throw new ApiError(
      500,
      "Study material file is not configured correctly."
    );
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SIGNED_URL_TTL_SECONDS;

  try {
    return cloudinary.utils.private_download_url(
      publicId,
      "pdf",
      {
        resource_type: "raw",
        type: "authenticated",
        secure: true,
        attachment: false,
        expires_at: expiresAt,
      }
    );
  } catch (error) {
    console.error(
      "Signed study material URL generation failed:",
      error?.message || error
    );

    throw new ApiError(
      500,
      "Unable to generate study material access URL."
    );
  }
};

// =========================================
// CREATE
// =========================================

const createStudyMaterial = async ({
  title,
  description,
  subject,
  chapter,
  isPaid,
  file,
  createdBy,
}) => {
  if (
    !mongoose.isValidObjectId(
      createdBy
    )
  ) {
    throw new ApiError(
      400,
      "Invalid creator ID."
    );
  }

  if (!file?.buffer) {
    throw new ApiError(
      400,
      "Please select a PDF file."
    );
  }

  // PDF magic-header verification.
  const fileSignature = file.buffer
    .subarray(0, 5)
    .toString("ascii");

  if (fileSignature !== "%PDF-") {
    throw new ApiError(
      400,
      "The selected file is not a valid PDF."
    );
  }

  const normalizedTitle = normalizeString(
    title || file.originalname,
    150
  );

  const normalizedDescription =
    normalizeString(
      description,
      500
    );

  const normalizedSubject =
    normalizeString(
      subject,
      100
    );

  const normalizedChapter =
    normalizeString(
      chapter,
      150
    );

  if (!normalizedTitle) {
    throw new ApiError(
      400,
      "Study material title is required."
    );
  }

  if (!normalizedSubject) {
    throw new ApiError(
      400,
      "Subject is required."
    );
  }

  const paid =
    String(isPaid) === "true" ||
    isPaid === true;

  let uploaded = null;

  try {
    uploaded = await uploadPdfBuffer(file);

    if (!uploaded?.public_id) {
      throw new ApiError(
        500,
        "PDF upload failed."
      );
    }

    const material =
      await StudyMaterial.create({
        title: normalizedTitle,
        description:
          normalizedDescription,
        subject: normalizedSubject,
        chapter: normalizedChapter,
        isPaid: paid,
        publicId:
          uploaded.public_id,
        resourceType: "raw",
        originalName:
          file.originalname,
        createdBy,
      });

    return material.toObject();
  } catch (error) {
    if (uploaded?.public_id) {
      await deleteCloudinaryPdf(
        uploaded.public_id
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    console.error(
      "Create study material failed:",
      error?.message || error
    );

    throw new ApiError(
      500,
      "Unable to create study material."
    );
  }
};

// =========================================
// ADMIN LIST
// =========================================

const getAdminStudyMaterials = async ({
  page = 1,
  limit = 10,
  search = "",
  subject = "",
  isPaid,
}) => {
  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    50,
    Math.max(1, Number(limit) || 10)
  );

  const skip =
    (safePage - 1) * safeLimit;

  const filter = {};

  const normalizedSearch =
    String(search || "").trim();

  if (normalizedSearch) {
    const searchRegex = new RegExp(
      escapeRegex(normalizedSearch),
      "i"
    );

    filter.$or = [
      { title: searchRegex },
      { subject: searchRegex },
      { chapter: searchRegex },
    ];
  }

  const normalizedSubject =
    String(subject || "").trim();

  if (normalizedSubject) {
    filter.subject = new RegExp(
      `^${escapeRegex(
        normalizedSubject
      )}$`,
      "i"
    );
  }

  if (
    isPaid === true ||
    isPaid === false
  ) {
    filter.isPaid = isPaid;
  }

  const [
    materials,
    total,
  ] = await Promise.all([
    StudyMaterial.find(filter)
      .select(
        "_id title description subject chapter isPaid originalName createdAt updatedAt"
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    StudyMaterial.countDocuments(
      filter
    ),
  ]);

  return {
    materials,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },
  };
};

// =========================================
// STUDENT LIST
// =========================================

const getStudentStudyMaterials = async (
  studentId,
  {
    page = 1,
    limit = 12,
    search = "",
    subject = "",
  } = {}
) => {
  if (
    !mongoose.isValidObjectId(
      studentId
    )
  ) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    50,
    Math.max(1, Number(limit) || 12)
  );

  const skip =
    (safePage - 1) * safeLimit;

  const filter = {};

  const normalizedSearch =
    String(search || "").trim();

  if (normalizedSearch) {
    const searchRegex = new RegExp(
      escapeRegex(normalizedSearch),
      "i"
    );

    filter.$or = [
      { title: searchRegex },
      { subject: searchRegex },
      { chapter: searchRegex },
    ];
  }

  const normalizedSubject =
    String(subject || "").trim();

  if (normalizedSubject) {
    filter.subject = new RegExp(
      `^${escapeRegex(
        normalizedSubject
      )}$`,
      "i"
    );
  }

  const [
    materials,
    total,
    accessStatus,
  ] = await Promise.all([
    StudyMaterial.find(filter)
      .select(
        "_id title description subject chapter isPaid originalName createdAt"
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    StudyMaterial.countDocuments(
      filter
    ),

    getStudentAccessStatus(
      studentId
    ),
  ]);

  return {
    materials: materials.map(
      (material) => {
        const allowed =
          !material.isPaid ||
          Boolean(
            accessStatus.premiumAccess
          );

        return {
          ...material,
          accessAllowed: allowed,
          accessType:
            material.isPaid
              ? allowed
                ? accessStatus.accessType
                : "SUBSCRIPTION_REQUIRED"
              : "FREE",
        };
      }
    ),

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },

    access: {
      trial: accessStatus.trial,
      subscription:
        accessStatus.subscription,
      premiumAccess:
        accessStatus.premiumAccess,
      accessType:
        accessStatus.accessType,
    },
  };
};

// =========================================
// STUDENT SINGLE MATERIAL
// =========================================

const getStudentStudyMaterial = async (
  studentId,
  materialId
) => {
  if (
    !mongoose.isValidObjectId(
      studentId
    )
  ) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  if (
    !mongoose.isValidObjectId(
      materialId
    )
  ) {
    throw new ApiError(
      400,
      "Invalid study material ID."
    );
  }

  const material =
    await StudyMaterial.findById(
      materialId
    ).lean();

  if (!material) {
    throw new ApiError(
      404,
      "Study material not found."
    );
  }

  const accessStatus =
    await getStudentAccessStatus(
      studentId
    );

  if (
    material.isPaid &&
    !accessStatus.premiumAccess
  ) {
    throw new ApiError(
      403,
      "Premium access is required to open this study material."
    );
  }

  const viewerUrl =
    generateSignedPdfUrl(
      material.publicId
    );

  return {
    _id: material._id,
    title: material.title,
    description:
      material.description,
    subject: material.subject,
    chapter: material.chapter,
    isPaid: material.isPaid,
    originalName:
      material.originalName,
    createdAt: material.createdAt,
    viewerUrl,
    expiresIn:
      SIGNED_URL_TTL_SECONDS,
    accessType:
      material.isPaid
        ? accessStatus.accessType
        : "FREE",
  };
};

// =========================================
// DELETE
// =========================================

const deleteStudyMaterial = async (
  materialId
) => {
  if (
    !mongoose.isValidObjectId(
      materialId
    )
  ) {
    throw new ApiError(
      400,
      "Invalid study material ID."
    );
  }

  const material =
    await StudyMaterial.findById(
      materialId
    );

  if (!material) {
    throw new ApiError(
      404,
      "Study material not found."
    );
  }

  await StudyMaterial.deleteOne({
    _id: materialId,
  });

  await deleteCloudinaryPdf(
    material.publicId
  );

  return {
    deletedId: materialId,
  };
};

module.exports = {
  createStudyMaterial,
  getAdminStudyMaterials,
  getStudentStudyMaterials,
  getStudentStudyMaterial,
  deleteStudyMaterial,
};