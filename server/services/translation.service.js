const ApiError = require("../utils/ApiError");

const TRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL ||
  "https://libretranslate-sj86.onrender.com/translate";

const TRANSLATION_TIMEOUT = Number(
  process.env.TRANSLATION_TIMEOUT_MS || 30000
);
const MAX_RETRIES = Number(
  process.env.TRANSLATION_MAX_RETRIES || 2
);
const RETRY_DELAY = Number(
  process.env.TRANSLATION_RETRY_DELAY_MS || 1000
);

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const parseTranslationResponse = (responseText) => {
  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Translation service returned invalid JSON: ${responseText.slice(
        0,
        300
      )}`
    );
  }

  if (!data || data.translatedText == null) {
    throw new Error("Translation service returned an invalid response.");
  }

  return Array.isArray(data.translatedText)
    ? data.translatedText
    : [data.translatedText];
};

const requestTranslation = async (texts, target = "hi") => {
  const controller = new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    TRANSLATION_TIMEOUT
  );

  try {
    const response = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        q: texts,
        source: "en",
        target,
        format: "text",
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Translation request failed with status ${response.status}: ${responseText.slice(
          0,
          300
        )}`
      );
    }

    return parseTranslationResponse(responseText);
  } finally {
    clearTimeout(timeoutId);
  }
};

const translateBatch = async (texts, target = "hi") => {
  const activeTexts = texts.map((text) =>
    typeof text === "string" ? text.trim() : ""
  );

  if (!activeTexts.some(Boolean)) {
    return activeTexts.map(() => "");
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const translated = await requestTranslation(
        activeTexts,
        target
      );

      if (translated.length !== activeTexts.length) {
        throw new Error(
          `Translation count mismatch. Expected ${activeTexts.length}, received ${translated.length}.`
        );
      }

      return translated.map((value, index) => {
        if (!activeTexts[index]) return "";

        if (
          typeof value !== "string" ||
          !value.trim()
        ) {
          throw new Error(
            `Translation is empty for item ${index + 1}.`
          );
        }

        return value.trim();
      });
    } catch (error) {
      lastError = error;

      console.warn(
        `Batch translation failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`
      );

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new Error("Batch translation failed.");
};

const translateText = async (text, target = "hi") => {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return "";
  }

  try {
    const [translated] = await translateBatch(
      [text],
      target
    );

    return translated;
  } catch (error) {
    throw new ApiError(
      502,
      `Text translation failed after ${MAX_RETRIES} attempts: ${error.message}`
    );
  }
};

const translateQuestionToHindi = async (questionData) => {
  const sourceTexts = [
    questionData.question,
    questionData.optionA,
    questionData.optionB,
    questionData.optionC,
    questionData.optionD,
    questionData.explanation || "",
  ];

  try {
    let translations;

    try {
      // Preferred: one request for the whole question.
      translations = await translateBatch(
        sourceTexts,
        "hi"
      );
    } catch (batchError) {
      // Fallback for LibreTranslate deployments that only
      // accept a single string in `q`.
      console.warn(
        `Batch translation unavailable; falling back to single-text translation: ${batchError.message}`
      );

    }

    return {
      questionHindi: translations[0] || "",
      optionAHindi: translations[1] || "",
      optionBHindi: translations[2] || "",
      optionCHindi: translations[3] || "",
      optionDHindi: translations[4] || "",
      explanationHindi: translations[5] || "",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      502,
      `Question translation failed after ${MAX_RETRIES} attempts: ${error.message}`
    );
  }
};

module.exports = {
  translateText,
  translateQuestionToHindi,
};