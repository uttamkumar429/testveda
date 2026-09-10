import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import ExamCard from "../../components/students/ExamCard";

import { fetchAvailableExams } from "../../redux/studentExam/examThunk";
import paymentService from "../../services/paymentService";

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Unable to load payment checkout."));
    document.body.appendChild(script);
  });

import {
  selectAvailableExams,
  selectExamLoading,
  selectExamError,
} from "../../redux/studentExam/examSelectors";

function StudentExams() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const exams = useSelector(selectAvailableExams);
  const loading = useSelector(selectExamLoading);
  const error = useSelector(selectExamError);
  const [paymentExamId, setPaymentExamId] = useState(null);

  useEffect(() => {
    dispatch(fetchAvailableExams());
  }, [dispatch]);

  const handleStartExam = async (exam) => {
    if (!exam?._id) return;

    // Free exams can be opened only after their scheduled start time.
    if (!exam.isPaid) {
      if (exam.status !== "ACTIVE") return;

      navigate("/student/exam/instructions", {
        state: { exam },
      });
      return;
    }

    // A purchased paid exam still waits for its scheduled start time.
    if (exam.isPurchased) {
      if (exam.status !== "ACTIVE") return;

      navigate("/student/exam/instructions", {
        state: { exam },
      });
      return;
    }

    if (paymentExamId) return;

    try {
      setPaymentExamId(exam._id);
      await loadRazorpay();

      const response = await paymentService.createOrder(exam._id);
      const data = response?.data;

      if (data?.alreadyPaid) {
        navigate("/student/exam/instructions", { state: { exam: { ...exam, isPurchased: true } } });
        return;
      }

      if (!data?.keyId || !data?.orderId) {
        throw new Error("Payment order could not be created.");
      }

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency || "INR",
          name: "TestVeda",
          description: exam.title,
          order_id: data.orderId,
          handler: async (paymentResponse) => {
            try {
              await paymentService.verify({
                snapshotId: exam._id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              });
              resolve();
            } catch (verificationError) {
              reject(verificationError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
          theme: { color: "#2563eb" },
        });

        checkout.on("payment.failed", () =>
          reject(new Error("Payment failed. Please try again."))
        );
        checkout.open();
      });

      toast.success("Payment successful. Test unlocked.");
      navigate("/student/exam/instructions", {
        state: { exam: { ...exam, isPurchased: true } },
      });
    } catch (paymentError) {
      toast.error(
        paymentError?.response?.data?.message ||
          paymentError?.message ||
          "Payment could not be completed."
      );
    } finally {
      setPaymentExamId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>

          <h2 className="text-xl font-semibold text-slate-700">
            Loading Exams...
          </h2>

          <p className="mt-2 text-slate-500">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

        <h2 className="text-xl font-bold text-red-600">
          Failed to Load Exams
        </h2>

        <p className="mt-2 text-red-500">
          {error}
        </p>

        <button
          onClick={() => dispatch(fetchAvailableExams())}
          className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>

      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}

      <div>

        <h1 className="text-3xl font-bold text-slate-800">
          Available Exams
        </h1>

        <p className="mt-2 text-slate-500">
          Start your scheduled examinations.
        </p>

      </div>

      {/* Empty */}

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">

          <h2 className="text-2xl font-semibold text-slate-700">
            No Exams Available
          </h2>

          <p className="mt-3 text-slate-500">
            Your upcoming examinations will appear here.
          </p>

        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {exams.map((exam) => (
            <ExamCard
              key={exam._id}
              exam={exam}
              onStart={handleStartExam}
              paymentLoading={paymentExamId === exam._id}
            />
          ))}

        </div>
      )}

    </div>
  );
}

export default StudentExams;