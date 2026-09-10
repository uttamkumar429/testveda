const ApiError = require("../utils/ApiError");

const TRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL ||
  "https://libretranslate-sj86.onrender.com/translate";

const TRANSLATION_TIMEOUT = Number(
  process.env.TRANSLATION_TIMEOUT_MS || 60000
);

const MAX_RETRIES = Number(
  process.env.TRANSLATION_MAX_RETRIES || 2
);

const RETRY_DELAY = Number(
  process.env.TRANSLATION_RETRY_DELAY_MS || 1500
);

const FIELD_MARKERS = {
  question: "[[QUESTION]]",
  optionA: "[[OPTION_A]]",
  optionB: "[[OPTION_B]]",
  optionC: "[[OPTION_C]]",
  optionD: "[[OPTION_D]]",
  explanation: "[[EXPLANATION]]",
};

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const requestTranslation = async (text, target = "hi") => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TRANSLATION_TIMEOUT);

  try {
    const response = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        q: text,
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

    if (
      !data ||
      typeof data.translatedText !== "string" ||
      !data.translatedText.trim()
    ) {
      throw new Error(
        "Translation service returned an invalid translatedText."
      );
    }

    return data.translatedText.trim();
  } finally {
    clearTimeout(timeoutId);
  }
};

const translateCombinedText = async (
  text,
  target = "hi"
) => {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      return await requestTranslation(text, target);
    } catch (error) {
      lastError = error;

      console.warn(
        `Translation failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`
      );

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new Error("Translation failed.");
};

const buildCombinedQuestionText = (questionData) => {
  return [
    `${FIELD_MARKERS.question}\n${questionData.question || ""}`,
    `${FIELD_MARKERS.optionA}\n${questionData.optionA || ""}`,
    `${FIELD_MARKERS.optionB}\n${questionData.optionB || ""}`,
    `${FIELD_MARKERS.optionC}\n${questionData.optionC || ""}`,
    `${FIELD_MARKERS.optionD}\n${questionData.optionD || ""}`,
    `${FIELD_MARKERS.explanation}\n${
      questionData.explanation || ""
    }`,
  ].join("\n\n");
};

const extractField = (translatedText, marker, nextMarkers) => {
  const startIndex = translatedText.indexOf(marker);

  if (startIndex === -1) {
    throw new Error(
      `Translation marker missing: ${marker}`
    );
  }

  const contentStart =
    startIndex + marker.length;

  let endIndex = translatedText.length;

  for (const nextMarker of nextMarkers) {
    const index = translatedText.indexOf(
      nextMarker,
      contentStart
    );

    if (index !== -1) {
      endIndex = Math.min(endIndex, index);
    }
  }

  const value = translatedText
    .slice(contentStart, endIndex)
    .trim();

  if (!value) {
    throw new Error(
      `Translated field is empty: ${marker}`
    );
  }

  return value;
};

const translateQuestionToHindi = async (
  questionData
) => {
  if (
    !questionData ||
    typeof questionData.question !== "string" ||
    !questionData.question.trim()
  ) {
    throw new ApiError(
      400,
      "Question text is required for translation."
    );
  }

  const combinedText =
    buildCombinedQuestionText(questionData);

  try {
    const translatedText =
      await translateCombinedText(
        combinedText,
        "hi"
      );

    const markers = Object.values(FIELD_MARKERS);

    return {
      questionHindi: extractField(
        translatedText,
        FIELD_MARKERS.question,
        markers.filter(
          (marker) =>
            marker !== FIELD_MARKERS.question
        )
      ),

      optionAHindi: extractField(
        translatedText,
        FIELD_MARKERS.optionA,
        markers.filter(
          (marker) =>
            marker !== FIELD_MARKERS.optionA
        )
      ),

      optionBHindi: extractField(
        translatedText,
        FIELD_MARKERS.optionB,
        markers.filter(
          (marker) =>
            marker !== FIELD_MARKERS.optionB
        )
      ),

      optionCHindi: extractField(
        translatedText,
        FIELD_MARKERS.optionC,
        markers.filter(
          (marker) =>
            marker !== FIELD_MARKERS.optionC
        )
      ),

      optionDHindi: extractField(
        translatedText,
        FIELD_MARKERS.optionD,
        markers.filter(
          (marker) =>
            marker !== FIELD_MARKERS.optionD
        )
      ),

      explanationHindi:
        questionData.explanation?.trim()
          ? extractField(
              translatedText,
              FIELD_MARKERS.explanation,
              markers.filter(
                (marker) =>
                  marker !==
                  FIELD_MARKERS.explanation
              )
            )
          : "",
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

const translateText = async (
  text,
  target = "hi"
) => {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return "";
  }

  try {
    return await translateCombinedText(
      text.trim(),
      target
    );
  } catch (error) {
    throw new ApiError(
      502,
      `Text translation failed after ${MAX_RETRIES} attempts: ${error.message}`
    );
  }
};

module.exports = {
  translateText,
  translateQuestionToHindi,
};