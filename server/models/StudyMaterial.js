const mongoose = require("mongoose");

const studyMaterialSchema = new mongoose.Schema(
  {
    // =========================================
    // BASIC INFORMATION
    // =========================================

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    chapter: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
      index: true,
    },

    // =========================================
    // ACCESS
    // =========================================

    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =========================================
    // CLOUDINARY
    // =========================================

    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ["raw"],
      default: "raw",
    },

    originalName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },

    // =========================================
    // AUDIT
    // =========================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================
// INDEXES
// =========================================

studyMaterialSchema.index({
  subject: 1,
  chapter: 1,
  createdAt: -1,
});

studyMaterialSchema.index({
  isPaid: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "StudyMaterial",
  studyMaterialSchema
);