import {
  BookOpen,
  Clock3,
  CalendarDays,
  Award,
  PlayCircle,
} from "lucide-react";

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ExamCard({ exam, onStart, paymentLoading = false }) {
  const isPaid = Boolean(exam.isPaid);

  const hasPremiumAccess =
    !isPaid ||
    Boolean(exam.trialActive) ||
    Boolean(exam.subscriptionActive);

  const canSubscribe =
    isPaid && !hasPremiumAccess;

  const canStart =
    exam.status === "ACTIVE" &&
    hasPremiumAccess;

  const disabled =
    paymentLoading ||
    (!canSubscribe && !canStart);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {exam.title}
          </h2>

          <p className="mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <BookOpen size={16} />

            {exam.subject}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            exam.status === "UPCOMING"
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : exam.status === "ACTIVE"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {exam.status}
        </span>
      </div>

      {/* Details */}

      <div className="space-y-3 text-sm">
        {/* Questions */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Questions
          </span>

          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {exam.totalQuestions ?? 0}
          </span>
        </div>

        {/* Total Marks */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Total Marks
          </span>

          <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-100">
            <Award
              size={16}
              className="text-orange-600 dark:text-orange-400"
            />

            {exam.totalMarks ?? 0}
          </span>
        </div>

        {/* Duration */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Duration
          </span>

          <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-100">
            <Clock3
              size={16}
              className="text-slate-600 dark:text-slate-300"
            />

            {exam.duration ?? 0} mins
          </span>
        </div>

        {/* Price */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Access
          </span>

          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {!exam.isPaid
              ? "Free"
              : exam.trialActive
                ? "Included in Free Trial"
                : exam.subscriptionActive
                  ? "Included in Subscription"
                  : `Premium`}
          </span>
        </div>

        {/* Date */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Date
          </span>

          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-100">
            <CalendarDays
              size={16}
              className="text-slate-600 dark:text-slate-300"
            />

            {formatDate(exam.startTime)}
          </span>
        </div>

        {/* Time */}

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Time
          </span>

          <span className="text-slate-800 dark:text-slate-100">
            {formatTime(exam.startTime)}
          </span>
        </div>
      </div>

      {/* Footer */}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onStart(exam)}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition ${
          canSubscribe || canStart
            ? "bg-blue-600 hover:bg-blue-700"
            : "cursor-not-allowed bg-slate-400 dark:bg-slate-600"
        }`}
      >
        <PlayCircle size={18} />

          {paymentLoading
            ? "Processing..."
            : canSubscribe
              ? "Subscribe Now"
              : canStart
                ? "Start Exam"
                : exam.status === "UPCOMING"
                  ? "Starts Later"
                  : "Subscription Required"}
      </button>
    </div>
  );
}

export default ExamCard;