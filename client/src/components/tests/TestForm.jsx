import {useState } from "react";

import QuestionSelector from "../questions/QuestionSelector";
import { toastService } from "../../lib/toast";
const convertLocalToUTC = (dateTime) => {
  if (!dateTime) return null;

  return new Date(dateTime).toISOString();
};

const formatDateTimeLocal = (dateTime) => {
  if (!dateTime) return "";

  const date = new Date(dateTime);

  const offset =
    date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
};

const getInitialFormData = (initialValues) => ({
  title: initialValues?.title || "",
  subject: initialValues?.subject || "",
  description:
    initialValues?.description || "",
  isPaid: Boolean(initialValues?.isPaid),
  price: initialValues?.price ?? "",
  duration:
    initialValues?.duration || "",
  startTime: formatDateTimeLocal(
    initialValues?.startTime
  ),

  endTime: formatDateTimeLocal(
    initialValues?.endTime
  ),
});

const getInitialSelectedQuestions = (
  initialValues
) => {
  if (
    !Array.isArray(
      initialValues?.questions
    )
  ) {
    return [];
  }

  return initialValues.questions.map(
    (question) =>
      typeof question === "string"
        ? question
        : question._id
  );
};
function TestForm({
  initialValues,
  onSubmit,
  loading = false,
  submitText = "Save Test",
}) {
  const [formData, setFormData] =
    useState(() =>
      getInitialFormData(initialValues)
    );

  const [
    selectedQuestions,
    setSelectedQuestions,
  ] = useState(() =>
    getInitialSelectedQuestions(
      initialValues
    )
  );
    // ===========================
  // Validation Errors
  // ===========================

  const [formErrors, setFormErrors] =
    useState({});
 

  // ===========================
  // Input Change
  // ===========================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }

      const next = {
        ...prev,
      };

      delete next[name];

      return next;
    });
  };

    // ===========================
  // Validate Form
  // ===========================

  const validateForm = () => {
    const errors = {};

    // --------------------------------
    // Title
    // --------------------------------

    const title =
      formData.title.trim();

    if (!title) {
      errors.title =
        "Test title is required.";
    }

    // --------------------------------
    // Subject
    // --------------------------------

    const subject =
      formData.subject.trim();

    if (!subject) {
      errors.subject =
        "Subject is required.";
    }

    // --------------------------------
    // Duration
    // --------------------------------

    const duration =
      Number(formData.duration);

    if (!formData.duration) {
      errors.duration =
        "Duration is required.";
    } else if (
      !Number.isInteger(duration) ||
      duration < 1
    ) {
      errors.duration =
        "Duration must be a whole number greater than 0.";
    }

    // --------------------------------
    // Start Time
    // --------------------------------

    if (!formData.startTime) {
      errors.startTime =
        "Start time is required.";
    }

    // --------------------------------
    // End Time
    // --------------------------------

    if (!formData.endTime) {
      errors.endTime =
        "End time is required.";
    }

    // --------------------------------
    // Date Validation
    // --------------------------------

    if (
      formData.startTime &&
      formData.endTime
    ) {
      const startDate =
        new Date(
          formData.startTime
        );

      const endDate =
        new Date(
          formData.endTime
        );

      if (
        Number.isNaN(
          startDate.getTime()
        )
      ) {
        errors.startTime =
          "Please enter a valid start time.";
      }

      if (
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        errors.endTime =
          "Please enter a valid end time.";
      }

      if (
        !Number.isNaN(
          startDate.getTime()
        ) &&
        !Number.isNaN(
          endDate.getTime()
        ) &&
        endDate <= startDate
      ) {
        errors.endTime =
          "End time must be later than start time.";
      }
    }

    // --------------------------------
    // Price
    // --------------------------------

    if (formData.isPaid) {
      const price = Number(formData.price);

      if (!Number.isFinite(price) || price <= 0) {
        errors.price =
          "Price must be greater than 0 for a paid test.";
      }
    }

    // --------------------------------
    // Questions
    // --------------------------------

    if (
      !Array.isArray(
        selectedQuestions
      ) ||
      selectedQuestions.length === 0
    ) {
      errors.questions =
        "Please select at least one question.";
    }

    setFormErrors(errors);

    return (
      Object.keys(errors).length === 0
    );
  };

  // ===========================
  // Submit
  // ===========================

  const handleSubmit = (e) => {
    e.preventDefault();

    const isValid =
      validateForm();

    if (!isValid) {
      toastService.error(
        "Please correct the highlighted fields."
      );

      return;
    }

  const payload = {
    ...formData,

    title: formData.title.trim(),

    subject: formData.subject.trim(),

    description: formData.description.trim(),

    isPaid: Boolean(formData.isPaid),

    price: formData.isPaid
      ? Number(formData.price)
      : 0,

    duration: Number(formData.duration),

    startTime: convertLocalToUTC(
      formData.startTime
    ),

    endTime: convertLocalToUTC(
      formData.endTime
    ),

    questions: selectedQuestions,
  };
    onSubmit(payload);
  };

    // ===========================
  // Question Selection Change
  // ===========================

  const handleSelectedQuestionsChange = (
    nextQuestions
  ) => {
    setSelectedQuestions(
      nextQuestions
    );

    if (
      nextQuestions.length > 0 &&
      formErrors.questions
    ) {
      setFormErrors((prev) => {
        const next = {
          ...prev,
        };

        delete next.questions;

        return next;
      });
    }
  };

    // ===========================
  // Reset Form
  // ===========================

  const handleReset = () => {
    setFormData(
      getInitialFormData(initialValues)
    );

    setSelectedQuestions(
      getInitialSelectedQuestions(
        initialValues
      )
    );

    setFormErrors({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ===========================
          Title
      =========================== */}

      <div>

        <label className="mb-2 block font-medium">

          Title

        </label>

        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Physics Motion Test"
          className="w-full rounded-lg border px-4 py-3"
        />
        {formErrors.title && (
          <p className="mt-2 text-sm text-red-600">
            {formErrors.title}
          </p>
        )}

      </div>

      {/* ===========================
          Subject
      =========================== */}

      <div>

        <label className="mb-2 block font-medium">

          Subject

        </label>

        <input
          type="text"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Physics"
          className="w-full rounded-lg border px-4 py-3"
        />
        {formErrors.subject && (
          <p className="mt-2 text-sm text-red-600">
            {formErrors.subject}
          </p>
        )}

      </div>

      {/* ===========================
          Description
      =========================== */}

      <div>

        <label className="mb-2 block font-medium">

          Description

        </label>

        <textarea
          rows={4}
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter description..."
          className="w-full rounded-lg border px-4 py-3"
        />

      </div>

      {/* ===========================
          Access / Price
      =========================== */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex items-center gap-3 font-medium text-slate-800">
          <input
            type="checkbox"
            name="isPaid"
            checked={Boolean(formData.isPaid)}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isPaid: e.target.checked,
                price: e.target.checked ? prev.price : "",
              }))
            }
            className="h-5 w-5 accent-blue-600"
          />
          Paid Test
        </label>

        <p className="mt-2 text-sm text-slate-500">
          Students must complete payment before starting this exam.
        </p>

        {formData.isPaid && (
          <div className="mt-4 max-w-xs">
            <label className="mb-2 block font-medium">
              Price (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="20"
              className="w-full rounded-lg border px-4 py-3"
            />
            {formErrors.price && (
              <p className="mt-2 text-sm text-red-600">
                {formErrors.price}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ===========================
          Duration / Time
      =========================== */}

      <div className="grid gap-5 md:grid-cols-3">

        <div>

          <label className="mb-2 block font-medium">

            Duration (Minutes)

          </label>

          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-3"
          />
          {formErrors.duration && (
            <p className="mt-2 text-sm text-red-600">
              {formErrors.duration}
            </p>
          )}

        </div>

        <div>

          <label className="mb-2 block font-medium">

            Start Time

          </label>

          <input
            type="datetime-local"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-3"
          />
          {formErrors.startTime && (
            <p className="mt-2 text-sm text-red-600">
              {formErrors.startTime}
            </p>
          )}

        </div>

        <div>

          <label className="mb-2 block font-medium">

            End Time

          </label>

          <input
            type="datetime-local"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-3"
          />
          {formErrors.endTime && (
            <p className="mt-2 text-sm text-red-600">
              {formErrors.endTime}
            </p>
          )}

        </div>

      </div>
            {/* ===========================
          Questions
      =========================== */}

      <QuestionSelector
        selectedQuestions={
          selectedQuestions
        }
        setSelectedQuestions={
          handleSelectedQuestionsChange
        }
        selectedQuestionDetails={
          Array.isArray(
            initialValues?.questions
          )
            ? initialValues.questions
            : []
        }
      />
      {formErrors.questions && (
        <p className="text-sm font-medium text-red-600">
          {formErrors.questions}
        </p>
      )}

      {/* ===========================
          Summary
      =========================== */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

        <h3 className="text-lg font-semibold text-slate-800">
          Test Summary
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">

          <div className="rounded-lg bg-white p-4 shadow-sm">

            <p className="text-sm text-slate-500">
              Subject
            </p>

            <p className="mt-1 font-semibold">
              {formData.subject || "--"}
            </p>

          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">

            <p className="text-sm text-slate-500">
              Duration
            </p>

            <p className="mt-1 font-semibold">
              {formData.duration || 0} Minutes
            </p>

          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">

            <p className="text-sm text-slate-500">
              Selected Questions
            </p>

            <p className="mt-1 font-semibold">
              {selectedQuestions.length}
            </p>

          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">

            <p className="text-sm text-slate-500">
              Start Time
            </p>

            <p className="mt-1 font-semibold">
              {formData.startTime || "--"}
            </p>

          </div>

        </div>

      </div>

      {/* ===========================
          Buttons
      =========================== */}

      <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={handleReset}
        className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Reset
      </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : submitText}
        </button>

      </div>

    </form>
  );
}

export default TestForm;