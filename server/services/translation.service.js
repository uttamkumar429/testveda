const ApiError = require("../utils/ApiError");

const TRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL ||
  "https://libretranslate-sj86.onrender.com/translate";

const TRANSLATION_TIMEOUT = Number(
  process.env.TRANSLATION_TIMEOUT_MS || 60000
);

const MAX_RETRIES = Number(
  process.env.TRANSLATION_MAX_RETRIES || 3
);

const RETRY_DELAY = Number(
  process.env.TRANSLATION_RETRY_DELAY_MS || 5000
);

// =====================================
// HTML HELPERS
// =====================================

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const decodeHtml = (value) => {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
};

// =====================================
// REQUEST
// =====================================

const requestTranslation = async (
  html,
  target = "hi"
) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TRANSLATION_TIMEOUT);

  try {
    const response = await fetch(
      TRANSLATE_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          q: html,
          source: "en",
          target,
          format: "html",
        }),

        signal: controller.signal,
      }
    );

    const responseText =
      await response.text();

    if (response.status === 429) {
      const retryAfter =
        response.headers.get("retry-after");

      const error = new Error(
        `Translation service rate limited the request (429)${
          retryAfter
            ? `. Retry-After: ${retryAfter}`
            : ""
        }`
      );

      error.status = 429;
      error.retryAfter = retryAfter;

      throw error;
    }

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
      typeof data.translatedText !==
        "string" ||
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

// =====================================
// RETRY
// =====================================

const translateHtml = async (
  html,
  target = "hi"
) => {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      return await requestTranslation(
        html,
        target
      );
    } catch (error) {
      lastError = error;

      console.warn(
        `Translation attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (
        attempt >= MAX_RETRIES
      ) {
        break;
      }

      let waitTime =
        RETRY_DELAY * attempt;

      if (
        error.status === 429 &&
        error.retryAfter
      ) {
        const retryAfterSeconds =
          Number(error.retryAfter);

        if (
          Number.isFinite(
            retryAfterSeconds
          )
        ) {
          waitTime = Math.max(
            waitTime,
            retryAfterSeconds * 1000
          );
        }
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            waitTime
          )
      );
    }
  }

  throw (
    lastError ||
    new Error(
      "Translation failed."
    )
  );
};

// =====================================
// BUILD QUESTION HTML
// =====================================

const buildQuestionHtml = (
  questionData
) => {
  return `
<div id="tv-question">${escapeHtml(
    questionData.question || ""
  )}</div>
<div id="tv-option-a">${escapeHtml(
    questionData.optionA || ""
  )}</div>
<div id="tv-option-b">${escapeHtml(
    questionData.optionB || ""
  )}</div>
<div id="tv-option-c">${escapeHtml(
    questionData.optionC || ""
  )}</div>
<div id="tv-option-d">${escapeHtml(
    questionData.optionD || ""
  )}</div>
<div id="tv-explanation">${escapeHtml(
    questionData.explanation || ""
  )}</div>
`.trim();
};

// =====================================
// EXTRACT TRANSLATED HTML
// =====================================

const extractHtmlField = (
  html,
  id,
  required = true
) => {
  const regex = new RegExp(
    `<div\\s+[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/div>`,
    "i"
  );

  const match =
    html.match(regex);

  if (!match) {
    if (!required) {
      return "";
    }

    throw new Error(
      `Translated field marker not found: ${id}`
    );
  }

  const value = decodeHtml(
    match[1]
      .replace(
        /<[^>]+>/g,
        ""
      )
  );

  if (
    required &&
    !value
  ) {
    throw new Error(
      `Translated field is empty: ${id}`
    );
  }

  return value;
};

// =====================================
// TRANSLATE QUESTION
// =====================================

const translateQuestionToHindi = async (
  questionData
) => {
  if (
    !questionData ||
    typeof questionData.question !==
      "string" ||
    !questionData.question.trim()
  ) {
    throw new ApiError(
      400,
      "Question text is required for translation."
    );
  }

  const html =
    buildQuestionHtml(
      questionData
    );

  try {
    const translatedHtml =
      await translateHtml(
        html,
        "hi"
      );

    const explanationRequired =
      Boolean(
        questionData.explanation &&
          questionData.explanation.trim()
      );

    return {
      questionHindi:
        extractHtmlField(
          translatedHtml,
          "tv-question"
        ),

      optionAHindi:
        extractHtmlField(
          translatedHtml,
          "tv-option-a"
        ),

      optionBHindi:
        extractHtmlField(
          translatedHtml,
          "tv-option-b"
        ),

      optionCHindi:
        extractHtmlField(
          translatedHtml,
          "tv-option-c"
        ),

      optionDHindi:
        extractHtmlField(
          translatedHtml,
          "tv-option-d"
        ),

      explanationHindi:
        extractHtmlField(
          translatedHtml,
          "tv-explanation",
          explanationRequired
        ),
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

// =====================================
// SINGLE TEXT TRANSLATION
// =====================================

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
    return await translateHtml(
      escapeHtml(text.trim()),
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