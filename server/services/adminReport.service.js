const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const { getAttemptDetails } = require("./adminExam.service");
const TestSnapshot = require("../models/TestSnapshot");
const ExamAttempt = require("../models/ExamAttempt");
const ApiError = require("../utils/ApiError");

const EXPORT_STATUS = "SUBMITTED";
const PASS_PERCENTAGE = 33;
const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${fieldName}.`);
  }
};

const safeFilenamePart = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "report";

/**
 * Excel/CSV formula injection protection.
 * Any user-controlled text beginning with a formula prefix is exported
 * as literal text rather than an executable spreadsheet formula.
 */
const safeSpreadsheetText = (value) => {
  if (value === null || value === undefined) return "";

  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

const escapeCsv = (value) => {
  const text = safeSpreadsheetText(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const formatIsoDate = (value) =>
  value instanceof Date
    ? value.toISOString()
    : value
      ? new Date(value).toISOString()
      : "";

const getStudentReport = async (attemptId) => {
  assertObjectId(attemptId, "attempt ID");

  const attempt = await ExamAttempt.findById(attemptId)
    .select("testSnapshot")
    .lean();

  if (!attempt) {
    throw new ApiError(404, "Exam attempt not found.");
  }

  return getAttemptDetails(
    attempt.testSnapshot.toString(),
    attemptId
  );
};

const generateStudentReportPDF = async (attemptId, res) => {
  const report = await getStudentReport(attemptId);

  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    info: {
      Title: "Student Examination Report",
      Author: "TestVeda",
    },
  });

  res.status(200);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="student-report-${safeFilenamePart(attemptId)}.pdf"`
  );
  res.setHeader("Cache-Control", "private, no-store");

  doc.on("error", (error) => {
    if (!res.headersSent) {
      res.destroy(error);
    } else {
      res.destroy();
    }
  });

  doc.pipe(res);

  doc.fontSize(22).text("iRise Coaching Center", { align: "center" });
  doc.moveDown();
  doc.fontSize(16).text("Student Examination Report", { align: "center" });
  doc.moveDown(2);

  doc.fontSize(14).text("Student Details");
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(`Name : ${safeSpreadsheetText(report.student?.fullName)}`);
  doc.text(`User ID : ${safeSpreadsheetText(report.student?.userId)}`);
  doc.text(`Email : ${safeSpreadsheetText(report.student?.email)}`);
  doc.moveDown();

  doc.fontSize(14).text("Exam Details");
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(`Exam : ${safeSpreadsheetText(report.exam?.title)}`);
  doc.text(`Subject : ${safeSpreadsheetText(report.exam?.subject)}`);
  doc.moveDown();

  doc.fontSize(14).text("Summary");
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(
    `Marks : ${report.summary?.obtainedMarks ?? 0}/${report.summary?.totalMarks ?? 0}`
  );
  doc.text(`Percentage : ${report.summary?.percentage ?? 0}%`);
  doc.text(`Status : ${safeSpreadsheetText(report.summary?.status)}`);
  doc.text(`Time Taken : ${report.summary?.timeTaken ?? 0} Minutes`);
  doc.moveDown(2);

  doc.fontSize(16).text("Question Report");
  doc.moveDown();

  for (const [index, question] of (report.questions || []).entries()) {
    if (doc.y > 720) doc.addPage();

    doc
      .fontSize(13)
      .text(`${index + 1}. ${question.question || ""}`);

    doc.moveDown(0.3);
    doc.fontSize(11);
    doc.text(`Student Answer : ${question.selectedAnswer || "-"}`);
    doc.text(`Correct Answer : ${question.correctAnswer || "-"}`);
    doc.text(`Marks Awarded : ${question.marksAwarded ?? 0}`);
    doc.moveDown();
  }

  doc.end();
};

const getExamExportData = async (snapshotId) => {
  assertObjectId(snapshotId, "snapshot ID");

  const snapshot = await TestSnapshot.findById(snapshotId)
    .select("_id title subject")
    .lean();

  if (!snapshot) {
    throw new ApiError(404, "Test snapshot not found.");
  }

  const attempts = await ExamAttempt.find({
    testSnapshot: snapshotId,
    status: EXPORT_STATUS,
  })
    .select(
      "student obtainedMarks totalMarks percentage timeTaken submittedAt"
    )
    .populate({
      path: "student",
      select: "userId fullName email",
    })
    .sort({ obtainedMarks: -1, submittedAt: 1, _id: 1 })
    .lean();

  return { snapshot, attempts };
};

const toExportRow = (attempt) => ({
  userId: safeSpreadsheetText(attempt.student?.userId),
  fullName: safeSpreadsheetText(attempt.student?.fullName),
  email: safeSpreadsheetText(attempt.student?.email),
  marks: Number(attempt.obtainedMarks ?? 0),
  totalMarks: Number(attempt.totalMarks ?? 0),
  percentage: Number(attempt.percentage ?? 0),
  status:
    Number(attempt.percentage ?? 0) >= PASS_PERCENTAGE ? "Pass" : "Fail",
  timeTaken: Number(attempt.timeTaken ?? 0),
  submittedAt: formatIsoDate(attempt.submittedAt),
});

const exportExamCSV = async (snapshotId, res) => {
  const { snapshot, attempts } = await getExamExportData(snapshotId);

  const filename = `exam-${safeFilenamePart(snapshot._id)}.csv`;

  res.status(200);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.setHeader("Cache-Control", "private, no-store");

  // UTF-8 BOM helps Excel correctly detect Unicode CSV files.
  res.write("\uFEFF");

  const headers = [
    "Student ID",
    "Student Name",
    "Email",
    "Marks",
    "Total Marks",
    "Percentage",
    "Status",
    "Time Taken",
    "Submitted At",
  ];

  res.write(`${headers.map(escapeCsv).join(",")}\r\n`);

  for (const attempt of attempts) {
    const row = toExportRow(attempt);
    const values = [
      row.userId,
      row.fullName,
      row.email,
      row.marks,
      row.totalMarks,
      row.percentage,
      row.status,
      row.timeTaken,
      row.submittedAt,
    ];

    res.write(`${values.map(escapeCsv).join(",")}\r\n`);
  }

  res.end();
};

const exportExamExcel = async (snapshotId, res) => {
  assertObjectId(snapshotId, "snapshot ID");

  const snapshot = await TestSnapshot.findById(snapshotId)
    .select("_id title subject")
    .lean();

  if (!snapshot) {
    throw new ApiError(404, "Test snapshot not found.");
  }

  const filename = `exam-${safeFilenamePart(snapshot._id)}.xlsx`;

  res.status(200);
  res.setHeader("Content-Type", EXCEL_CONTENT_TYPE);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.setHeader("Cache-Control", "private, no-store");

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true,
  });

  workbook.creator = "TestVeda";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Exam Results");

  worksheet.columns = [
    { header: "Student ID", key: "userId", width: 18 },
    { header: "Student Name", key: "fullName", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Marks", key: "marks", width: 12 },
    { header: "Total Marks", key: "totalMarks", width: 15 },
    { header: "Percentage", key: "percentage", width: 15 },
    { header: "Status", key: "status", width: 12 },
    { header: "Time Taken", key: "timeTaken", width: 15 },
    { header: "Submitted At", key: "submittedAt", width: 30 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.commit();

  const cursor = ExamAttempt.find({
    testSnapshot: snapshotId,
    status: EXPORT_STATUS,
  })
    .select(
      "student obtainedMarks totalMarks percentage timeTaken submittedAt"
    )
    .populate({
      path: "student",
      select: "userId fullName email",
    })
    .sort({ obtainedMarks: -1, submittedAt: 1, _id: 1 })
    .lean()
    .cursor();

  try {
    for await (const attempt of cursor) {
      worksheet.addRow(toExportRow(attempt)).commit();
    }

    worksheet.commit();
    await workbook.commit();
  } catch (error) {
    cursor.close?.().catch(() => {});
    if (!res.destroyed) res.destroy(error);
    throw error;
  }
};

module.exports = {
  getStudentReport,
  generateStudentReportPDF,
  getExamExportData,
  exportExamCSV,
  exportExamExcel,
};
