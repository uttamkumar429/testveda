const ApiError = require("../utils/ApiError");

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_CONCURRENCY = 1;
const MAX_TRANSLATABLE_TEXT_LENGTH = 10000;

// Prevent repeatedly hitting a provider which is currently rate limited.
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60000;

const QUESTION_TRANSLATION_FIELDS = [
  ["question", "questionHindi"],
  ["optionA", "optionAHindi"],
  ["optionB", "optionBHindi"],
  ["optionC", "optionCHindi"],
  ["optionD", "optionDHindi"],
  ["explanation", "explanationHindi"],
];

let providerRateLimitedUntil = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
};

const getConfig = () => {
  const provider = String(
    process.env.TRANSLATION_PROVIDER ||
      (process.env.LIBRETRANSLATE_URL
        ? "libretranslate"
        : "google")
  ).toLowerCase();

  const timeoutMs = toPositiveNumber(
    process.env.TRANSLATION_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  );

  const maxRetries = Math.min(
    5,
    Math.floor(
      toPositiveNumber(
        process.env.TRANSLATION_MAX_RETRIES,
        DEFAULT_MAX_RETRIES
      )
    )
  );

  const retryDelayMs = toPositiveNumber(
    process.env.TRANSLATION_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS
  );

  const concurrency = Math.min(
    5,
    Math.max(
      1,
      Math.floor(
        toPositiveNumber(
          process.env.TRANSLATION_CONCURRENCY,
          DEFAULT_CONCURRENCY
        )
      )
    )
  );

  const rateLimitCooldownMs = Math.min(
    300000,
    Math.max(
      5000,
      Math.floor(
        toPositiveNumber(
          process.env.TRANSLATION_RATE_LIMIT_COOLDOWN_MS,
          DEFAULT_RATE_LIMIT_COOLDOWN_MS
        )
      )
    )
  );

  return {
    provider,
    timeoutMs,
    maxRetries,
    retryDelayMs,
    concurrency,
    rateLimitCooldownMs,
    source: String(
      process.env.TRANSLATION_SOURCE_LANGUAGE || "en"
    ).trim(),
  };
};

const normalizeLanguage = (language) => {
  const value = String(language || "hi")
    .trim()
    .toLowerCase();

  if (!/^[a-z]{2,5}(?:-[a-z]{2,5})?$/.test(value)) {
    throw new ApiError(
      400,
      "Invalid translation target language."
    );
  }

  return value;
};

const normalizeText = (text) =>
  typeof text === "string" ? text.trim() : "";

const assertTextSize = (text) => {
  if (text.length > MAX_TRANSLATABLE_TEXT_LENGTH) {
    throw new ApiError(
      400,
      `Text is too long to translate. Maximum length is ${MAX_TRANSLATABLE_TEXT_LENGTH} characters.`
    );
  }
};

const parseRetryAfterMs = (value) => {
  if (!value) return 0;

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 60000);
  }

  const date = Date.parse(value);

  if (Number.isFinite(date)) {
    return Math.min(
      Math.max(date - Date.now(), 0),
      60000
    );
  }

  return 0;
};

const isRetryableStatus = (status) =>
  [408, 425, 429, 500, 502, 503, 504].includes(status);

const buildProviderError = (
  message,
  status,
  retryAfter
) => {
  const error = new Error(message);

  error.status = status;
  error.retryAfter = retryAfter;

  return error;
};

const createRateLimitError = (cooldownMs) => {
  const error = new Error(
    "Translation provider is rate limited. Retrying later."
  );

  error.status = 429;
  error.retryAfter = cooldownMs;

  return error;
};

const isProviderRateLimited = () =>
  Date.now() < providerRateLimitedUntil;

const markProviderRateLimited = (cooldownMs) => {
  const safeCooldown = Math.min(
    Math.max(
      Number(cooldownMs) || DEFAULT_RATE_LIMIT_COOLDOWN_MS,
      5000
    ),
    300000
  );

  providerRateLimitedUntil = Date.now() + safeCooldown;
};

const requestLibreTranslate = async (
  text,
  target,
  config
) => {
  const url = process.env.LIBRETRANSLATE_URL;

  if (!url) {
    throw new ApiError(
      500,
      "LibreTranslate URL is not configured."
    );
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeoutMs
  );

  try {
    const body = {
      q: text,
      source: config.source,
      target,
      format: "text",
    };

    if (process.env.LIBRETRANSLATE_API_KEY) {
      body.api_key =
        process.env.LIBRETRANSLATE_API_KEY;
    }

    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw buildProviderError(
          "Translation provider timed out.",
          504
        );
      }

      throw error;
    }

    const raw = await response.text();

    if (!response.ok) {
      throw buildProviderError(
        `LibreTranslate request failed with status ${response.status}.`,
        response.status,
        response.headers.get("retry-after")
      );
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "LibreTranslate returned invalid JSON."
      );
    }

    const translated = normalizeText(
      data?.translatedText
    );

    if (!translated) {
      throw new Error(
        "LibreTranslate returned an empty translation."
      );
    }

    return translated;
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestGoogleTranslate = async (
  texts,
  target,
  config
) => {
  const apiKey =
    process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      500,
      "Google Translation API key is not configured."
    );
  }

  const url =
    process.env.GOOGLE_TRANSLATE_URL ||
    "https://translation.googleapis.com/language/translate/v2";

  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeoutMs
  );

  try {
    let response;

    try {
      response = await fetch(
        `${url}?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            Accept: "application/json",
          },
          body: JSON.stringify({
            q: texts,
            source: config.source,
            target,
            format: "text",
          }),
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        throw buildProviderError(
          "Translation provider timed out.",
          504
        );
      }

      throw error;
    }

    const raw = await response.text();

    if (!response.ok) {
      throw buildProviderError(
        `Google Translation request failed with status ${response.status}.`,
        response.status,
        response.headers.get("retry-after")
      );
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Google Translation returned invalid JSON."
      );
    }

    const translations =
      data?.data?.translations;

    if (
      !Array.isArray(translations) ||
      translations.length !== texts.length
    ) {
      throw new Error(
        "Google Translation returned an invalid response."
      );
    }

    return translations.map((item) => {
      const translated = normalizeText(
        item?.translatedText
      );

      if (!translated) {
        throw new Error(
          "Google Translation returned empty text."
        );
      }

      return translated;
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const translateWithRetry = async (
  text,
  target,
  config
) => {
  if (isProviderRateLimited()) {
    throw createRateLimitError(
      Math.max(
        providerRateLimitedUntil - Date.now(),
        5000
      )
    );
  }

  let lastError;

  for (
    let attempt = 1;
    attempt <= config.maxRetries;
    attempt += 1
  ) {
    try {
      if (isProviderRateLimited()) {
        throw createRateLimitError(
          Math.max(
            providerRateLimitedUntil - Date.now(),
            5000
          )
        );
      }

      if (config.provider === "google") {
        const [translated] =
          await requestGoogleTranslate(
            [text],
            target,
            config
          );

        return translated;
      }

      if (
        config.provider === "libretranslate"
      ) {
        return await requestLibreTranslate(
          text,
          target,
          config
        );
      }

      throw new ApiError(
        500,
        `Unsupported translation provider: ${config.provider}.`
      );
    } catch (error) {
      lastError = error;

      if (
        error instanceof ApiError &&
        error.statusCode === 500
      ) {
        throw error;
      }

      const status = Number(error?.status);

      /*
       * 429 is handled specially.
       *
       * Do not keep hammering a rate-limited provider.
       */
      if (status === 429) {
        const retryAfterMs =
          parseRetryAfterMs(
            error?.retryAfter
          ) || config.rateLimitCooldownMs;

        markProviderRateLimited(
          retryAfterMs
        );

        break;
      }

      const retryable =
        !Number.isFinite(status) ||
        isRetryableStatus(status);

      if (
        !retryable ||
        attempt >= config.maxRetries
      ) {
        break;
      }

      const retryAfterMs =
        parseRetryAfterMs(
          error?.retryAfter
        );

      const exponentialMs =
        config.retryDelayMs *
        2 ** (attempt - 1);

      // Small jitter prevents synchronized retries.
      const jitterMs =
        Math.floor(Math.random() * 250);

      const delayMs = Math.min(
        Math.max(
          exponentialMs,
          retryAfterMs
        ) + jitterMs,
        60000
      );

      await sleep(delayMs);
    }
  }

  throw (
    lastError ||
    new Error("Translation failed.")
  );
};

const translateWithRetryGoogleBatch = async (
  texts,
  target,
  config
) => {
  if (!texts.length) {
    return [];
  }

  if (isProviderRateLimited()) {
    throw createRateLimitError(
      Math.max(
        providerRateLimitedUntil - Date.now(),
        5000
      )
    );
  }

  let lastError;

  for (
    let attempt = 1;
    attempt <= config.maxRetries;
    attempt += 1
  ) {
    try {
      if (isProviderRateLimited()) {
        throw createRateLimitError(
          Math.max(
            providerRateLimitedUntil - Date.now(),
            5000
          )
        );
      }

      return await requestGoogleTranslate(
        texts,
        target,
        config
      );
    } catch (error) {
      lastError = error;

      if (
        error instanceof ApiError &&
        error.statusCode === 500
      ) {
        throw error;
      }

      const status = Number(error?.status);

      if (status === 429) {
        const retryAfterMs =
          parseRetryAfterMs(
            error?.retryAfter
          ) || config.rateLimitCooldownMs;

        markProviderRateLimited(
          retryAfterMs
        );

        break;
      }

      const retryable =
        !Number.isFinite(status) ||
        isRetryableStatus(status);

      if (
        !retryable ||
        attempt >= config.maxRetries
      ) {
        break;
      }

      const retryAfterMs =
        parseRetryAfterMs(
          error?.retryAfter
        );

      const exponentialMs =
        config.retryDelayMs *
        2 ** (attempt - 1);

      const jitterMs =
        Math.floor(Math.random() * 250);

      const delayMs = Math.min(
        Math.max(
          exponentialMs,
          retryAfterMs
        ) + jitterMs,
        60000
      );

      await sleep(delayMs);
    }
  }

  throw (
    lastError ||
    new Error("Google Translation failed.")
  );
};

const runWithConcurrency = async (
  items,
  worker,
  concurrency
) => {
  const results = new Array(items.length);

  let nextIndex = 0;

  const safeConcurrency = Math.max(
    1,
    Math.min(
      Number(concurrency) || 1,
      items.length || 1
    )
  );

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(
        items[index],
        index
      );
    }
  };

  const workers = Array.from(
    {
      length: safeConcurrency,
    },
    () => runWorker()
  );

  await Promise.all(workers);

  return results;
};

const translateText = async (
  text,
  target = "hi"
) => {
  const normalizedText =
    normalizeText(text);

  if (!normalizedText) {
    return "";
  }

  assertTextSize(normalizedText);

  const normalizedTarget =
    normalizeLanguage(target);

  const config = getConfig();

  try {
    return await translateWithRetry(
      normalizedText,
      normalizedTarget,
      config
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (Number(error?.status) === 429) {
      throw new ApiError(
        429,
        "Translation service is rate limited. Please retry later."
      );
    }

    throw new ApiError(
      502,
      "Translation service is temporarily unavailable."
    );
  }
};

const translateQuestionToHindi = async (
  questionData
) => {
  if (
    !questionData ||
    !normalizeText(questionData.question)
  ) {
    throw new ApiError(
      400,
      "Question text is required for translation."
    );
  }

  const config = getConfig();

  const entries =
    QUESTION_TRANSLATION_FIELDS.map(
      ([source]) =>
        normalizeText(
          questionData[source]
        )
    );

  entries.forEach((text) => {
    if (text) {
      assertTextSize(text);
    }
  });

  try {
    let translated;

    /*
     * Google supports batching, so send all non-empty fields
     * in one request instead of creating multiple API calls.
     */
    if (config.provider === "google") {
      const activeEntries = entries
        .map((text, index) => ({
          text,
          index,
        }))
        .filter(
          (item) => Boolean(item.text)
        );

      const values = activeEntries.map(
        (item) => item.text
      );

      const translatedValues =
        values.length
          ? await translateWithRetryGoogleBatch(
              values,
              "hi",
              config
            )
          : [];

      translated = entries.map(
        () => ""
      );

      activeEntries.forEach(
        (item, index) => {
          translated[item.index] =
            translatedValues[index];
        }
      );
    } else {
      /*
       * LibreTranslate is deliberately limited by
       * configured concurrency. Default = 1.
       *
       * This reduces 429 risk significantly.
       */
      translated =
        await runWithConcurrency(
          entries,
          async (text) =>
            text
              ? translateWithRetry(
                  text,
                  "hi",
                  config
                )
              : "",
          Math.min(
            config.concurrency,
            1
          )
        );
    }

    return Object.fromEntries(
      QUESTION_TRANSLATION_FIELDS.map(
        ([, targetField], index) => [
          targetField,
          translated[index] || "",
        ]
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (Number(error?.status) === 429) {
      throw new ApiError(
        429,
        "Translation service is rate limited."
      );
    }

    throw new ApiError(
      502,
      "Question translation service is temporarily unavailable."
    );
  }
};

const translateQuestionToLanguage = async (
  questionData,
  target
) => {
  const normalizedTarget =
    normalizeLanguage(target);

  const entries =
    QUESTION_TRANSLATION_FIELDS.map(
      ([source]) =>
        normalizeText(
          questionData?.[source]
        )
    );

  entries.forEach((text) => {
    if (text) {
      assertTextSize(text);
    }
  });

  const config = getConfig();

  const translated =
    await runWithConcurrency(
      entries,
      async (text) =>
        text
          ? translateText(
              text,
              normalizedTarget
            )
          : "",
      config.provider === "libretranslate"
        ? Math.min(
            config.concurrency,
            1
          )
        : config.concurrency
    );

  return Object.fromEntries(
    QUESTION_TRANSLATION_FIELDS.map(
      ([, targetField], index) => [
        targetField,
        translated[index] || "",
      ]
    )
  );
};

const translateExamQuestions = async (
  questions,
  target = "hi"
) => {
  if (!Array.isArray(questions)) {
    throw new ApiError(
      400,
      "Questions must be an array."
    );
  }

  const config = getConfig();

  const translatedQuestions =
    await runWithConcurrency(
      questions,
      async (question) => {
        try {
          const translation =
            await translateQuestionToLanguage(
              question,
              target
            );

          return {
            ...question,
            ...translation,
          };
        } catch (error) {
          /*
           * Translation is optional during exam delivery.
           * Never break the exam because translation provider
           * is unavailable.
           */
          return {
            ...question,
            translationUnavailable: true,
          };
        }
      },
      config.provider === "libretranslate"
        ? Math.min(
            config.concurrency,
            1
          )
        : config.concurrency
    );

  return translatedQuestions;
};

module.exports = {
  translateText,
  translateQuestionToHindi,
  translateExamQuestions,
};