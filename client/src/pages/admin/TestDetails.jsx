import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import DashboardLayout from "../../layouts/DashboardLayout";

import TestHeader from "../../components/tests/TestHeader";
import TestDetailsCard from "../../components/tests/TestDetailsCard";
import TestQuestionList from "../../components/tests/TestQuestionList";
import TestDetailsActions from "../../components/tests/TestDetailsActions";


import {
  fetchTestById,
  deleteTest,
  publishTest,
} from "../../redux/adminTest/testThunk";

import {
  selectCurrentTest,
  selectTestLoading,
  selectTestError,
} from "../../redux/adminTest/testSelectors";

import { toastService } from "../../lib/toast";

function TestDetails() {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const { id } = useParams();

  const test = useSelector(selectCurrentTest);

  const loading = useSelector(selectTestLoading);

  const error = useSelector(selectTestError);

  useEffect(() => {
    dispatch(fetchTestById(id));
  }, [dispatch, id]);

  // ===============================
  // Back
  // ===============================

  const handleBack = () => {
    navigate("/admin/tests");
  };

  // ===============================
  // Edit
  // ===============================

  const handleEdit = () => {
    navigate(`/admin/tests/${id}/edit`);
  };

  // ===============================
  // Publish
  // ===============================

  const handlePublish = async () => {
    const confirmPublish = window.confirm(
      "Publish this test?"
    );

    if (!confirmPublish) return;

    try {
      await dispatch(
        publishTest(id)
      ).unwrap();

      toastService.success(
        "Test published successfully."
      );

      dispatch(fetchTestById(id));

    } catch (error) {
      toastService.error(error);
    }
  };

  // ===============================
  // Delete
  // ===============================

  // const refreshTest = async () => {
  //   await dispatch(fetchTestById(id)).unwrap();
  // };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Delete this test?"
    );

    if (!confirmDelete) return;

    try {
      await dispatch(
        deleteTest(id)
      ).unwrap();

      toastService.success(
        "Test deleted successfully."
      );

      navigate("/admin/tests");

    } catch (error) {
      toastService.error(error);
    }
  };
    // ===============================
  // Loading
  // ===============================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>

            <h2 className="mt-5 text-xl font-semibold text-slate-700">
              Loading Test...
            </h2>

          </div>

        </div>
      </DashboardLayout>
    );
  }

  // ===============================
  // Error
  // ===============================

  if (error) {
    return (
      <DashboardLayout>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">

          <h2 className="text-xl font-bold text-red-600">

            Failed to Load Test

          </h2>

          <p className="mt-2 text-red-500">

            {error}

          </p>

          <button
            onClick={() => dispatch(fetchTestById(id))}
            className="mt-5 rounded-lg bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>

        </div>

      </DashboardLayout>
    );
  }

  // ===============================
  // Empty
  // ===============================

  if (!test) {
    return (
      <DashboardLayout>

        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">

          <h2 className="text-2xl font-semibold text-slate-700">

            Test Not Found

          </h2>

          <p className="mt-3 text-slate-500">

            The requested test could not be found.

          </p>

        </div>

      </DashboardLayout>
    );
  }

  // ===============================
  // UI
  // ===============================

  return (

    <DashboardLayout>

      <div className="space-y-6">

        <TestHeader
          title={test.title}
          subject={test.subject}
          status={test.status}
          duration={test.duration}
          totalQuestions={test.totalQuestions}
          onBack={handleBack}
        />

        <TestDetailsCard
          test={test}
        />

        <TestQuestionList
          questions={test.questions}
        />

        <TestDetailsActions
          test={test}
          onBack={handleBack}
          onEdit={handleEdit}
          onPublish={handlePublish}
          onDelete={handleDelete}
          publishLoading={loading}
          deleteLoading={loading}
        />

      </div>

    </DashboardLayout>

  );
}

export default TestDetails;