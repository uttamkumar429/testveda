import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

function QuestionForm({
  mode = "create",
  initialValues = null,
  loading = false,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject: "",
      chapter: "",
      difficulty: "Easy",
      marks: 1,
      negativeMarks: 0,
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "",
      questionHindi: "",
      optionAHindi: "",
      optionBHindi: "",
      optionCHindi: "",
      optionDHindi: "",
      explanationHindi: "",
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        subject: initialValues.subject ?? "",
        chapter: initialValues.chapter ?? "",
        difficulty: initialValues.difficulty ?? "Easy",
        marks: initialValues.marks ?? 1,
        negativeMarks: initialValues.negativeMarks ?? 0,
        question: initialValues.question ?? "",
        optionA: initialValues.optionA ?? "",
        optionB: initialValues.optionB ?? "",
        optionC: initialValues.optionC ?? "",
        optionD: initialValues.optionD ?? "",
        correctAnswer: initialValues.correctAnswer ?? "A",
        explanation: initialValues.explanation ?? "",
        questionHindi: initialValues.questionHindi ?? "",
        optionAHindi: initialValues.optionAHindi ?? "",
        optionBHindi: initialValues.optionBHindi ?? "",
        optionCHindi: initialValues.optionCHindi ?? "",
        optionDHindi: initialValues.optionDHindi ?? "",
        explanationHindi: initialValues.explanationHindi ?? "",
      });
    }
  }, [initialValues, reset]);

  const [activeLanguage, setActiveLanguage] = useState("english");

  const submitHandler = (data) => {
    onSubmit(data);
  };

  const handleInvalid = (formErrors) => {
    const englishFields = ["question", "optionA", "optionB", "optionC", "optionD"];
    const hindiFields = [
      "questionHindi",
      "optionAHindi",
      "optionBHindi",
      "optionCHindi",
      "optionDHindi",
    ];

    const hasEnglishErrors = englishFields.some((field) => formErrors[field]);
    const hasHindiErrors = hindiFields.some((field) => formErrors[field]);

    if (activeLanguage === "english" && hasEnglishErrors) {
      setActiveLanguage("english");
    } else if (activeLanguage === "hindi" && hasHindiErrors) {
      setActiveLanguage("hindi");
    } else if (hasEnglishErrors) {
      setActiveLanguage("english");
    } else if (hasHindiErrors) {
      setActiveLanguage("hindi");
    }
  };

  const renderOptions = (hindi = false) => {
    const options = hindi
      ? [
          ["A", "optionAHindi"],
          ["B", "optionBHindi"],
          ["C", "optionCHindi"],
          ["D", "optionDHindi"],
        ]
      : [
          ["A", "optionA"],
          ["B", "optionB"],
          ["C", "optionC"],
          ["D", "optionD"],
        ];

    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {options.map(([key, field]) => (
          <div key={field}>
            <label className={labelClass}>
              {hindi ? `Hindi Option ${key}` : `Option ${key}`}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register(field, {
                required: `${hindi ? "Hindi " : ""}Option ${key} is required`,
                maxLength: {
                  value: 2000,
                  message: `${hindi ? "Hindi " : ""}Option ${key} cannot exceed 2000 characters`,
                },
              })}
              disabled={loading}
              className={inputClass}
              placeholder={
                hindi
                  ? `हिंदी विकल्प ${key} दर्ज करें`
                  : `Enter option ${key}`
              }
            />
            {renderError(errors[field])}
          </div>
        ))}
      </div>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-gray-100";

  const textareaClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-gray-100";

  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

  const sectionClass =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7";

  const renderError = (error) =>
    error ? <p className="mt-1.5 text-sm text-red-600">{error.message}</p> : null;

  return (
    <form
      onSubmit={handleSubmit(submitHandler, handleInvalid)}
      className="space-y-6"
    >
      {/* Basic Information */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
            01
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Basic Information
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add the subject, chapter, difficulty and marks for this question.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("subject", {
                required: "Subject is required",
                maxLength: {
                  value: 100,
                  message: "Subject cannot exceed 100 characters",
                },
              })}
              disabled={loading}
              className={inputClass}
              placeholder="Enter subject"
            />
            {renderError(errors.subject)}
          </div>

          <div>
            <label className={labelClass}>
              Chapter <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("chapter", {
                required: "Chapter is required",
                maxLength: {
                  value: 150,
                  message: "Chapter cannot exceed 150 characters",
                },
              })}
              disabled={loading}
              className={inputClass}
              placeholder="Enter chapter"
            />
            {renderError(errors.chapter)}
          </div>

          <div>
            <label className={labelClass}>Difficulty</label>
            <select
              {...register("difficulty")}
              disabled={loading}
              className={inputClass}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              {...register("marks", {
                required: "Marks are required",
                min: {
                  value: 1,
                  message: "Marks must be at least 1",
                },
                max: {
                  value: 100,
                  message: "Marks cannot exceed 100",
                },
              })}
              disabled={loading}
              className={inputClass}
              placeholder="Enter marks"
            />
            {renderError(errors.marks)}
          </div>

          <div>
            <label className={labelClass}>
              Negative Marks <span className="text-red-500">*</span>
            </label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              {...register("negativeMarks", {
                required: "Negative Marks are required",
                min: {
                  value: 0,
                  message: "Negative Marks cannot be less than 0",
                },
                max: {
                  value: 100,
                  message: "Negative Marks cannot exceed 100",
                },
              })}
              disabled={loading}
              className={inputClass}
              placeholder="Enter negative marks (0 = no negative marking)"
            />

            {renderError(errors.negativeMarks)}
          </div>
        </div>
      </section>

      {/* Language Selector */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveLanguage("english")}
            disabled={loading}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeLanguage === "english"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            English
          </button>

          <button
            type="button"
            onClick={() => setActiveLanguage("hindi")}
            disabled={loading}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeLanguage === "hindi"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            हिंदी
          </button>
        </div>
      </section>

      {/* Active Language Content */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
              activeLanguage === "english"
                ? "bg-blue-50 text-blue-700"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            02
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {activeLanguage === "english"
                ? "English Content"
                : "Hindi Content"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeLanguage === "english"
                ? "Enter the question and all four options in English."
                : "हिंदी में प्रश्न और सभी चार विकल्प दर्ज करें।"}
            </p>
          </div>
        </div>

        {activeLanguage === "english" ? (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                {...register("question", {
                  required: "Question is required",
                  maxLength: {
                    value: 5000,
                    message: "Question cannot exceed 5000 characters",
                  },
                })}
                disabled={loading}
                className={textareaClass}
                placeholder="Enter the English question"
              />
              {renderError(errors.question)}
            </div>

            {renderOptions(false)}

            <div>
              <label className={labelClass}>English Explanation</label>
              <textarea
                rows={4}
                {...register("explanation", {
                  maxLength: {
                    value: 5000,
                    message: "Explanation cannot exceed 5000 characters",
                  },
                })}
                disabled={loading}
                className={textareaClass}
                placeholder="Enter English explanation (optional)"
              />
              {renderError(errors.explanation)}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Hindi Question <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                {...register("questionHindi", {
                  required: "Hindi Question is required",
                  maxLength: {
                    value: 5000,
                    message: "Hindi Question cannot exceed 5000 characters",
                  },
                })}
                disabled={loading}
                className={textareaClass}
                placeholder="हिंदी प्रश्न दर्ज करें"
              />
              {renderError(errors.questionHindi)}
            </div>

            {renderOptions(true)}

            <div>
              <label className={labelClass}>Hindi Explanation</label>
              <textarea
                rows={4}
                {...register("explanationHindi", {
                  maxLength: {
                    value: 5000,
                    message: "Hindi Explanation cannot exceed 5000 characters",
                  },
                })}
                disabled={loading}
                className={textareaClass}
                placeholder="हिंदी व्याख्या दर्ज करें (वैकल्पिक)"
              />
              {renderError(errors.explanationHindi)}
            </div>
          </div>
        )}
      </section>

      {/* Common Correct Answer */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
            03
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Correct Answer
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the correct option. The same answer applies to both
              languages.
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Correct Answer <span className="text-red-500">*</span>
          </label>
          <select
            {...register("correctAnswer", {
              required: "Correct answer is required",
            })}
            disabled={loading}
            className={inputClass}
          >
            <option value="A">Option A</option>
            <option value="B">Option B</option>
            <option value="C">Option C</option>
            <option value="D">Option D</option>
          </select>
          {renderError(errors.correctAnswer)}
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Complete both English and Hindi content before submitting.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? mode === "edit"
              ? "Updating..."
              : "Creating..."
            : mode === "edit"
              ? "Update Question"
              : "Create Question"}
        </button>
      </div>
    </form>
  );
}

export default QuestionForm;
