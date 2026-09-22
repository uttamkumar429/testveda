const rateLimit = require("express-rate-limit");

const isProduction =
  process.env.NODE_ENV === "production";

// ===============================
// General API Limiter
// ===============================

const apiLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: isProduction ? 1000 : 100000,

  standardHeaders: true,

  legacyHeaders: false,

  // Skip OPTIONS preflight requests
  skip: (req) => {

    if (process.env.NODE_ENV === "test") {
      return true;
    }

    if (req.method === "OPTIONS") {
      return true;
    }

    if (
      req.originalUrl ===
      "/api/student/payments/webhook"
    ) {
      return true;
    }

    return false;
  },

  message: {
    success: false,

    message:
      "Too many requests. Please try again after 15 minutes.",
  },

});

// ===============================
// Login Limiter
// ===============================

const loginLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 100,

  standardHeaders: true,

  legacyHeaders: false,

  skip: (req) =>
    process.env.NODE_ENV === "test" ||
    req.method === "OPTIONS",

  message: {
    success: false,

    message:
      "Too many login attempts. Please try again later.",
  },

});

module.exports = {
  apiLimiter,
  loginLimiter,
};