const TranslationJob = require("../models/TranslationJob");

const enqueueQuestionTranslation = async (questionId) => {
  if (!questionId) return null;

  return TranslationJob.findOneAndUpdate(
    { question: questionId },
    {
      $set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        lastError: "",
      },
      $setOnInsert: {
        question: questionId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
};

module.exports = {
  enqueueQuestionTranslation,
};
