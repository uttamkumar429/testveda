// console.log("App.js Loaded");
const mongoSanitize = require("./middleware/mongoSanitize.middleware");
const {
  apiLimiter,
} = require("./middleware/rateLimiter.middleware");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const corsOptions = require("./config/corsOptions");
const app = express();

// =========================
// Import Routes
// =========================
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const authRoutes = require("./routes/auth.routes");

const profileRoutes = require("./routes/profile.routes");
const questionRoutes = require("./routes/question.routes");
const testRoutes = require("./routes/test.routes");
const publishRoutes = require("./routes/publish.routes");
const studentRoutes = require("./routes/student.routes");
const notificationPreferenceRoutes =
  require(
    "./routes/notificationPreference.routes"
  );
const notificationRoutes =
  require("./routes/notification.routes");
const errorHandler = require("./middleware/error.middleware");

const adminExamRoutes = require("./routes/adminExam.routes");
const adminAnalyticsRoutes = require("./routes/adminAnalytics.routes");
const adminReportRoutes=require("./routes/adminReport.routes");
const adminStudentRoutes = require("./routes/adminStudent.routes");
const announcementRoutes =
  require("./routes/announcement.routes");

const examRoutes = require("./routes/exam.routes");
const studentDashboardRoutes = require("./routes/studentDashboard.routes");
const studentExamRoutes = require("./routes/studentExam.routes");
const adminRoutes = require("./routes/admin.routes");
const systemSettingRoutes =
  require("./routes/systemSetting.routes");
const paymentRoutes = require("./routes/payment.routes");
const testMaterialRoutes = require("./routes/testMaterial.routes");
const adminStudyMaterialRoutes =
  require("./routes/adminStudyMaterial.routes");

const studentStudyMaterialRoutes =
  require("./routes/studentStudyMaterial.routes");
// =========================
// =========================
// Global Middleware
// =========================

app.use(cors(corsOptions));

app.use(helmet());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.use(mongoSanitize);

app.use(apiLimiter);

app.use(morgan("dev"));

// =========================
// Health Check API
// =========================
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is running successfully.",
  });
});
// Root API Route

app.get("/", (req, res) => {

  return res.status(200).json({

    success: true,

    message: "TestVeda API is running successfully.",

  });

});
// =========================
// Routes
// =========================

// Authentication
app.use("/api/auth", authRoutes);

// Admin
app.use(
    "/api/admin",
    adminRoutes
);
app.use("/api/admin/exams", examRoutes);
app.use("/api/admin/exams", adminExamRoutes);
app.use(
    "/api/admin/analytics",
    adminAnalyticsRoutes
);

app.use(
"/api/admin/reports",
adminReportRoutes
);
app.use(
  "/api/admin/students",
  adminStudentRoutes
);
app.use(
  "/api/announcements",
  announcementRoutes
);

// Profile
app.use("/api/profile", profileRoutes);


// Questions
app.use("/api/questions", questionRoutes);

// Tests (CRUD)
app.use("/api/tests", testRoutes);

// Publish Test
app.use("/api/tests", publishRoutes);
app.use("/api/tests", testMaterialRoutes);
app.use(
  "/api/admin/study-materials",
  adminStudyMaterialRoutes
);

app.use(
  "/api/student/study-materials",
  studentStudyMaterialRoutes
);
// Student APIs
app.use("/api/student", studentRoutes);
app.use("/api/student/payments", paymentRoutes);
app.use(
  "/api/student/settings",
  notificationPreferenceRoutes
);
app.use(
  "/api/student/notifications",
  notificationRoutes
);

app.use("/api/student/dashboard", studentDashboardRoutes);
app.use(
  "/api/student",
  studentExamRoutes
);
app.use(
  "/api/settings",
  systemSettingRoutes
);
// app.use(errorHandler);
// Swagger Documentation
if(process.env.NODE_ENV!=="production"){

  app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
  );

}
// =========================
// 404 Route
// =========================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// =========================
// Global Error Handler
// =========================
app.use(errorHandler);



module.exports = app;