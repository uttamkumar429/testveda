require("dotenv").config();
// console.log(process.env.MONGODB_URI);
const app = require("./app");
const connectDB = require("./config/db");
const {
  startTranslationWorker,
  stopTranslationWorker,
} = require("./workers/translation.worker");

connectDB().then(() => {
  startTranslationWorker();
});

const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const mongoose = require("mongoose");

const gracefulShutdown = async () => {
  console.log("\nShutting down gracefully...");

  stopTranslationWorker();

  await mongoose.connection.close();

  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
