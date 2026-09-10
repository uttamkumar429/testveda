import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import SubscriptionCard from "../../components/students/SubscriptionCard";
import paymentService from "../../services/paymentService";

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript =
      document.querySelector(
        `script[src="${RAZORPAY_SCRIPT_URL}"]`
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              "Unable to load payment checkout."
            )
          ),
        { once: true }
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => resolve(true);

    script.onerror = () => {
      reject(
        new Error(
          "Unable to load payment checkout."
        )
      );
    };

    document.body.appendChild(script);
  });

const formatDate = (date) => {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

function SubscriptionPage() {
  const navigate = useNavigate();

  const [status, setStatus] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

useEffect(() => {
  let active = true;

  paymentService
    .getSubscriptionStatus()
    .then((response) => {
      if (!active) return;

      setStatus(response?.data || null);
    })
    .catch((error) => {
      if (!active) return;

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load subscription status."
      );
    })
    .finally(() => {
      if (!active) return;

      setLoading(false);
    });

  return () => {
    active = false;
  };
}, []);

  // =========================================
  // SUBSCRIBE
  // =========================================

  const handleSubscribe = async () => {
    if (paymentLoading) {
      return;
    }

    try {
      setPaymentLoading(true);

// -------------------------------------
// CREATE SERVER ORDER
// -------------------------------------

const response =
  await paymentService.createSubscriptionOrder();

const data = response?.data;

if (!data?.orderId) {
  throw new Error(
    "Subscription order could not be created."
  );
}

// -------------------------------------
// MOCK PAYMENT
// -------------------------------------

if (
  import.meta.env.VITE_PAYMENT_MODE === "mock"
) {
  await paymentService.verifySubscriptionPayment({
    razorpay_order_id: data.orderId,
    razorpay_payment_id: `mock_payment_${Date.now()}`,
    razorpay_signature: "mock_signature",
  });

  toast.success(
    "Subscription activated successfully."
  );

  const statusResponse =
    await paymentService.getSubscriptionStatus();

  setStatus(statusResponse?.data || null);

  return;
}

// -------------------------------------
// LOAD RAZORPAY
// -------------------------------------

await loadRazorpay();

if (!data?.keyId) {
  throw new Error(
    "Payment service is not configured."
  );
}

      // -------------------------------------
      // OPEN RAZORPAY
      // -------------------------------------

      await new Promise(
        (resolve, reject) => {
          let completed = false;

          const checkout =
            new window.Razorpay({
              key: data.keyId,

              amount: data.amount,

              currency:
                data.currency ||
                "INR",

              name: "TestVeda",

              description:
                data.description ||
                "TestVeda Premium Subscription",

              order_id:
                data.orderId,

              prefill:
                data.prefill || undefined,

              handler:
                async (
                  paymentResponse
                ) => {
                  try {
                    if (completed) {
                      return;
                    }

                    completed = true;

                    await paymentService.verifySubscriptionPayment(
                      {
                        razorpay_order_id:
                          paymentResponse.razorpay_order_id,

                        razorpay_payment_id:
                          paymentResponse.razorpay_payment_id,

                        razorpay_signature:
                          paymentResponse.razorpay_signature,
                      }
                    );

                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                },

              modal: {
                ondismiss: () => {
                  if (completed) {
                    return;
                  }

                  completed = true;

                  reject(
                    new Error(
                      "Payment was cancelled."
                    )
                  );
                },
              },

              theme: {
                color: "#2563eb",
              },
            });

          checkout.on(
            "payment.failed",
            () => {
              if (completed) {
                return;
              }

              completed = true;

              reject(
                new Error(
                  "Payment failed. Please try again."
                )
              );
            }
          );

          checkout.open();
        }
      );

      // -------------------------------------
      // SUCCESS
      // -------------------------------------

toast.success(
  "Subscription activated successfully."
);

try {
  const statusResponse =
    await paymentService.getSubscriptionStatus();

  setStatus(
    statusResponse?.data || null
  );
} catch (statusError) {
  toast.error(
    statusError?.response?.data?.message ||
      statusError?.message ||
      "Subscription status could not be refreshed."
  );
}} finally {
      setPaymentLoading(false);
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-4 text-slate-500">
            Loading subscription...
          </p>
        </div>
      </div>
    );
  }

  const trial = status?.trial;

  const subscription =
    status?.subscription;

  const premiumAccess =
    Boolean(status?.premiumAccess);

  // =========================================
  // VIEW
  // =========================================

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* =====================================
          HEADER
      ===================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Premium Access
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage your TestVeda premium access.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/student/exams")
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />

          Back to Exams
        </button>
      </div>

      {/* =====================================
          ACTIVE SUBSCRIPTION
      ===================================== */}

      {subscription ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-900/10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 text-green-600"
                size={24}
              />

              <div>
                <h2 className="font-bold text-green-800 dark:text-green-300">
                  Premium Subscription Active
                </h2>

                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  Your premium access is currently active.
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-green-700 dark:text-green-400">
                Valid until
              </p>

              <p className="font-bold text-green-800 dark:text-green-300">
                {formatDate(
                  subscription.endDate
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================
          FREE TRIAL
      ===================================== */}

      {trial?.active ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/50 dark:bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Clock3
              className="mt-0.5 text-blue-600"
              size={23}
            />

            <div>
              <h2 className="font-bold text-blue-800 dark:text-blue-300">
                Your Free Trial Is Active
              </h2>

              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                You have{" "}
                <strong>
                  {trial.remainingDays}
                </strong>{" "}
                day
                {trial.remainingDays === 1
                  ? ""
                  : "s"}{" "}
                remaining.
              </p>

              <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                Trial ends on{" "}
                {formatDate(
                  trial.trialEndDate
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================
          ACTIVE ACCESS MESSAGE
      ===================================== */}

      {premiumAccess ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Premium exams are unlocked
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You can return to exams and access all
            premium tests available to your account.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/student/exams")
            }
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Browse Exams
          </button>
        </div>
      ) : null}

      {/* =====================================
          SUBSCRIPTION CARD
      ===================================== */}

      {!subscription ? (
        <SubscriptionCard
          amount={
            Number(
              import.meta.env
                .VITE_SUBSCRIPTION_PRICE
            ) || 499
          }
          currency="INR"
          loading={paymentLoading}
          onSubscribe={handleSubscribe}
        />
      ) : null}
    </div>
  );
}

export default SubscriptionPage;