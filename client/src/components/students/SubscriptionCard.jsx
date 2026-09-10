import {
  Check,
  Crown,
  Loader2,
  ShieldCheck,
} from "lucide-react";

function SubscriptionCard({
  amount = 499,
  currency = "INR",
  loading = false,
  onSubscribe,
}) {
    const numericAmount = Number(amount);

    const currencyLabel =
    currency === "INR" ? "₹" : currency;

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
      {/* =====================================
          HEADER
      ===================================== */}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3">
            <Crown size={26} />
          </div>

          <div>
            <p className="text-sm font-medium text-blue-100">
              TestVeda Premium
            </p>

            <h2 className="text-2xl font-bold">
              Unlock Premium Access
            </h2>
          </div>
        </div>

        <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100">
          Get full access to premium examinations
          and protected study materials with one
          active subscription.
        </p>
      </div>

      {/* =====================================
          BODY
      ===================================== */}

      <div className="p-8">
        {/* PRICE */}

        <div className="text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Monthly subscription
          </p>

          <div className="mt-2 flex items-end justify-center gap-1">
            <span className="text-5xl font-bold text-slate-900 dark:text-white">
            {currencyLabel}
            {Number.isFinite(numericAmount)
                ? numericAmount.toFixed(0)
                : "499"}
            </span>

            <span className="mb-2 text-slate-500 dark:text-slate-400">
              / month
            </span>
          </div>
        </div>

        {/* FEATURES */}

        <div className="mt-8 space-y-4">
          <Feature>
            Full access to premium tests
          </Feature>

          <Feature>
            Access to premium study materials
          </Feature>

          <Feature>
            All available subjects
          </Feature>

          <Feature>
            Results and performance tracking
          </Feature>

          <Feature>
            Secure exam access
          </Feature>
        </div>

        {/* SUBSCRIBE BUTTON */}

        <button
          type="button"
          onClick={onSubscribe}
          disabled={
            loading ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
          }
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Processing...
            </>
          ) : (
            <>
              <Crown size={18} />

              Subscribe Now
            </>
          )}
        </button>

        {/* SECURITY */}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck size={15} />

          Secure payment powered by Razorpay
        </div>
      </div>
    </div>
  );
}

function Feature({ children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400">
        <Check size={14} />
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-300">
        {children}
      </p>
    </div>
  );
}

export default SubscriptionCard;