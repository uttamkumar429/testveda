import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchResult } from "../../redux/studentResult/resultThunk";

import ResultSummary from "../../components/students/result/ResultSummary";
import StatisticsCards from "../../components/students/result/StatisticsCards";
import ResultActions from "../../components/students/result/ResultActions";

function ResultPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { attemptId } = useParams();

  const { result, loading, error } = useSelector(
    (state) => state.studentResult
  );

  useEffect(() => {
    if (!attemptId) {
      navigate("/student/dashboard", {
        replace: true,
      });

      return;
    }

    dispatch(fetchResult(attemptId));
  }, [dispatch, attemptId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading Result...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

          <h2 className="text-2xl font-bold text-red-600">
            Failed to Load Result
          </h2>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => dispatch(fetchResult(attemptId))}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Retry
          </button>

        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <h2 className="text-2xl font-bold text-slate-700">
            Result Not Found
          </h2>

          <p className="mt-3 text-slate-500">
            The requested exam result could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </button>

        </div>
      </div>
    );
  }
const {
  examTitle,
  subject,
  obtainedMarks,
  negativeMarksDeducted,
  totalMarks,
  percentage,
  correctAnswers,
  wrongAnswers,
  skippedAnswers,
  timeTaken,
  submittedAt,
  status,
} = result;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl space-y-8">

        <ResultSummary
          examTitle={examTitle}
          subject={subject}
          obtainedMarks={obtainedMarks}
          negativeMarksDeducted={negativeMarksDeducted}
          totalMarks={totalMarks}
          percentage={percentage}
          status={status}
        />

        <StatisticsCards
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          skippedAnswers={skippedAnswers}
          negativeMarksDeducted={negativeMarksDeducted}
          timeTaken={timeTaken}
          submittedAt={submittedAt}
        />

        <ResultActions
        onBack={() => navigate("/student/dashboard")}
        onReview={() => navigate(`/student/result/${attemptId}/review`)}
        reviewEnabled={true}
        />
      </div>
    </div>
  );
}

export default ResultPage;