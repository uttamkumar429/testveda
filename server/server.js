require("dotenv").config();

const mongoose = require("mongoose");

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");

    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  } catch (error) {
    console.error(
      "Error during graceful shutdown:",
      error?.message || error
    );

    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

connectDB().catch((error) => {
  console.error(
    "Database connection failed:",
    error?.message || error
  );

  process.exit(1);
});