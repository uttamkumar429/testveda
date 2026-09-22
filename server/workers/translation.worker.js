const TranslationJob = require("../models/TranslationJob");
const Question = require("../models/Question");
const {
  translateQuestionToHindi,
} = require("../services/translation.service");

const POLL_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.TRANSLATION_WORKER_POLL_MS) || 10000
);

const STALE_LOCK_MS = Math.max(
  60000,
  Number(process.env.TRANSLATION_WORKER_STALE_LOCK_MS) || 300000
);

const MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.TRANSLATION_WORKER_MAX_ATTEMPTS) || 8
);

const BACKOFF_MS = [
  60_000,
  120_000,
  300_000,
  600_000,
  1_200_000,
  1_800_000,
];

let workerTimer = null;
let workerRunning = false;

const getRetryDelay = (attempt) =>
  BACKOFF_MS[
    Math.min(attempt - 1, BACKOFF_MS.length - 1)
  ];

const claimNextJob = async () => {
  const now = new Date();
  const staleBefore = new Date(
    now.getTime() - STALE_LOCK_MS
  );

  return TranslationJob.findOneAndUpdate(
    {
      $or: [
        {
          status: {
            $in: ["pending", "failed"],
          },
          nextAttemptAt: {
            $lte: now,
          },
        },
        {
          status: "processing",
          lockedAt: {
            $lte: staleBefore,
          },
        },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
      },
    },
    {
      returnDocument: "after",
      sort: {
        nextAttemptAt: 1,
        createdAt: 1,
      },
    }
  ).lean();
};

const processJob = async (job) => {
  console.log(
    `[TranslationWorker] Processing job ${job._id} for question ${job.question}`
  );

  const question = await Question.findById(job.question)
    .select(
      "question optionA optionB optionC optionD explanation"
    )
    .lean();

  if (!question) {
    await TranslationJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          lockedAt: null,
          lastError: "Question no longer exists.",
        },
      }
    );

    return;
  }

  try {
    const translated =
      await translateQuestionToHindi(question);

    await Question.updateOne(
      { _id: question._id },
      {
        $set: {
          questionHindi:
            translated.questionHindi || "",
          optionAHindi:
            translated.optionAHindi || "",
          optionBHindi:
            translated.optionBHindi || "",
          optionCHindi:
            translated.optionCHindi || "",
          optionDHindi:
            translated.optionDHindi || "",
          explanationHindi:
            translated.explanationHindi || "",
        },
      }
    );

    await TranslationJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          lockedAt: null,
          lastError: "",
          nextAttemptAt: null,
        },
      }
    );

    console.log(
      `[TranslationWorker] Question ${question._id} translated successfully.`
    );
  } catch (error) {
    const attempts = Number(job.attempts || 0) + 1;

    if (attempts >= MAX_ATTEMPTS) {
      await TranslationJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "failed",
            attempts,
            lockedAt: null,
            lastError: String(
              error?.message || "Translation failed."
            ).slice(0, 2000),
            nextAttemptAt: null,
          },
        }
      );

      console.error(
        `[TranslationWorker] Question ${question._id} permanently failed after ${attempts} attempts: ${error?.message || error}`
      );

      return;
    }

    const retryDelay = getRetryDelay(attempts);

    await TranslationJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "pending",
          attempts,
          lockedAt: null,
          lastError: String(
            error?.message || "Translation failed."
          ).slice(0, 2000),
          nextAttemptAt: new Date(
            Date.now() + retryDelay
          ),
        },
      }
    );

    console.warn(
      `[TranslationWorker] Question ${question._id} translation failed (attempt ${attempts}/${MAX_ATTEMPTS}). Retry scheduled in ${Math.round(
        retryDelay / 1000
      )}s. Error: ${error?.message || error}`
    );
  }
};

const runWorker = async () => {
  if (workerRunning) return;

  workerRunning = true;

  try {
    const job = await claimNextJob();

    if (!job) {
      return;
    }

    console.log(
      `[TranslationWorker] Job claimed. Job: ${job._id}, Question: ${job.question}, Status: ${job.status}, Attempts: ${job.attempts}`
    );

    await processJob(job);
  } catch (error) {
    console.error(
      `[TranslationWorker] Worker cycle failed: ${error?.message || error}`
    );
  } finally {
    workerRunning = false;
  }
};
const startTranslationWorker = () => {
  if (workerTimer) return;

  workerTimer = setInterval(
    runWorker,
    POLL_INTERVAL_MS
  );

  if (typeof workerTimer.unref === "function") {
    workerTimer.unref();
  }

  console.log(
    `[TranslationWorker] Started. Poll interval: ${POLL_INTERVAL_MS}ms`
  );

  // Process pending jobs immediately after startup.
  void runWorker();
};

const stopTranslationWorker = () => {
  if (!workerTimer) return;

  clearInterval(workerTimer);
  workerTimer = null;
};

module.exports = {
  startTranslationWorker,
  stopTranslationWorker,
};
