const multer = require("multer");

// =========================================
// CONFIG
// =========================================

const MAX_FILE_SIZE =
  Number(process.env.PDF_MAX_FILE_SIZE_MB || 10) *
  1024 *
  1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
];

// =========================================
// MEMORY STORAGE
// =========================================

const storage = multer.memoryStorage();

// =========================================
// FILE FILTER
// =========================================

const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(
      new Error("Please select a PDF file.")
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "Only PDF files are allowed."
      )
    );
  }

  cb(null, true);
};

// =========================================
// MULTER INSTANCE
// =========================================

const pdfUpload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter,
});

// =========================================
// EXPORT
// =========================================

module.exports = pdfUpload;