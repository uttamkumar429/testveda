function ResultSummary({
  examTitle,
  subject,
  obtainedMarks,
  negativeMarksDeducted = 0,
  totalMarks,
  percentage,
  status,
}) {
  const isPassed = status?.toLowerCase() === "pass";
  return (
    <section className="rounded-xl bg-white p-8 shadow">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Exam Result
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {examTitle}
        </h1>

        <p className="mt-2 text-lg text-gray-600">
          {subject}
        </p>

        <div className="mt-8">
          <h2 className="text-6xl font-bold text-gray-900">
            {obtainedMarks}/{totalMarks}
          </h2>

          <p className="mt-3 text-2xl font-semibold text-gray-700">
            {Number(percentage ?? 0).toFixed(2)}%
          </p>

          <div className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Correct Marks</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {(Number(obtainedMarks || 0) + Number(negativeMarksDeducted || 0)).toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm text-red-600">Negative Marks Deducted</p>
              <p className="mt-1 text-xl font-bold text-red-700">
                -{Number(negativeMarksDeducted || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <span
            className={`mt-5 inline-flex rounded-full px-5 py-2 text-sm font-semibold ${
              isPassed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isPassed ? "PASS" : "FAIL"}
          </span>
        </div>
      </div>
    </section>
  );
}

export default ResultSummary;