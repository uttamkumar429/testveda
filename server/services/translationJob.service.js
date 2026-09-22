const TranslationJob = require("../models/TranslationJob");

const enqueueQuestionTranslation = async (questionId) => {
  if (!questionId) {
    console.warn(
      "[TranslationJob] Cannot enqueue translation: questionId missing."
    );
    return null;
  }

  try {
    const job = await TranslationJob.findOneAndUpdate(
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
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    ).lean();

    console.log(
      `[TranslationJob] Job queued successfully. Job: ${job?._id}, Question: ${questionId}`
    );

    return job;
  } catch (error) {
    console.error(
      `[TranslationJob] Failed to enqueue Question ${questionId}:`,
      error?.message || error
    );

    throw error;
  }
};

module.exports = {
  enqueueQuestionTranslation,
};