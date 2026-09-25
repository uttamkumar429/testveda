const User = require("../../models/User");
const Question = require("../../models/Question");
const Test = require("../../models/Test");
const TestSnapshot = require("../../models/TestSnapshot");
const ExamAttempt = require("../../models/ExamAttempt");

const Notification = require("../../models/Notification");
const NotificationPreference = require("../../models/NotificationPreference");

const cleanup = async () => {
  // =====================================
  // CLEAR TEST DATA
  // =====================================

  await User.deleteMany({});
  await Question.deleteMany({});
  await Test.deleteMany({});
  await TestSnapshot.deleteMany({});
  await ExamAttempt.deleteMany({});

  // =====================================
  // CLEAR NOTIFICATION DATA
  // =====================================

  await Notification.deleteMany({});
  await NotificationPreference.deleteMany({});

  // =====================================
  // RESET NOTIFICATION INDEXES
  // =====================================

  try {
    await Notification.collection.dropIndex(
      "student_1_dedupeKey_1"
    );
  } catch (error) {
    const ignorableErrors = [
      "IndexNotFound",
      "NamespaceNotFound",
    ];

    if (!ignorableErrors.includes(error?.codeName)) {
      throw error;
    }
  }

  // =====================================
  // SYNC CURRENT MODEL INDEXES
  // =====================================

  await Notification.syncIndexes();
};

module.exports = cleanup;