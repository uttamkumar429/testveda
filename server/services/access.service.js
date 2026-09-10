const mongoose = require("mongoose");

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const TestSnapshot = require("../models/TestSnapshot");
const TestPurchase = require("../models/TestPurchase");

const ApiError = require("../utils/ApiError");

// =========================================
// CONFIG
// =========================================

const TRIAL_DAYS = Math.max(
  0,
  Number(process.env.FREE_TRIAL_DAYS || 30)
);

// =========================================
// DATE HELPERS
// =========================================

const addDays = (date, days) => {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
};

// =========================================
// TRIAL STATUS
// =========================================

const getTrialStatus = async (
  studentId,
  now = new Date()
) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  const user = await User.findById(studentId)
    .select("createdAt")
    .lean();

  if (!user) {
    throw new ApiError(
      404,
      "Student not found."
    );
  }

  const trialStartDate = new Date(
    user.createdAt
  );

  const trialEndDate = addDays(
    trialStartDate,
    TRIAL_DAYS
  );

  const active =
    TRIAL_DAYS > 0 &&
    now < trialEndDate;

  const remainingDays = active
    ? Math.max(
        0,
        Math.ceil(
          (
            trialEndDate.getTime() -
            now.getTime()
          ) / 86400000
        )
      )
    : 0;

  return {
    active,
    trialStartDate,
    trialEndDate,
    remainingDays,
    configuredDays: TRIAL_DAYS,
  };
};

// =========================================
// ACTIVE SUBSCRIPTION
// =========================================

const getActiveSubscription = async (
  studentId,
  now = new Date()
) => {
  if (!mongoose.isValidObjectId(studentId)) {
    return null;
  }

  const active =
    await Subscription.findOne({
      student: studentId,
      status: "ACTIVE",
      startDate: {
        $lte: now,
      },
      endDate: {
        $gte: now,
      },
    })
      .sort({
        endDate: -1,
      })
      .lean();

  // =======================================
  // MARK OLD ACTIVE SUBSCRIPTIONS EXPIRED
  // =======================================

  if (!active) {
    await Subscription.updateMany(
      {
        student: studentId,
        status: "ACTIVE",
        endDate: {
          $lt: now,
        },
      },
      {
        $set: {
          status: "EXPIRED",
        },
      }
    );
  }

  return active;
};

// =========================================
// INDIVIDUAL PURCHASE
// =========================================
//
// Backward compatibility for the old
// individual-test payment system.
// =========================================

const hasIndividualPurchase = async (
  studentId,
  snapshotId
) => {
  if (
    !mongoose.isValidObjectId(studentId) ||
    !mongoose.isValidObjectId(snapshotId)
  ) {
    return false;
  }

  const purchase =
    await TestPurchase.findOne({
      student: studentId,
      testSnapshot: snapshotId,
      status: "PAID",
    })
      .select("_id")
      .lean();

  return Boolean(purchase);
};

// =========================================
// PREMIUM TEST ACCESS
// =========================================

const hasPremiumAccess = async (
  studentId,
  snapshotId,
  now = new Date()
) => {
  if (
    !mongoose.isValidObjectId(studentId)
  ) {
    throw new ApiError(
      400,
      "Invalid student ID."
    );
  }

  if (
    !mongoose.isValidObjectId(snapshotId)
  ) {
    throw new ApiError(
      400,
      "Invalid exam ID."
    );
  }

  const snapshot =
    await TestSnapshot.findById(snapshotId)
      .select("_id isPaid")
      .lean();

  if (!snapshot) {
    throw new ApiError(
      404,
      "Test not found."
    );
  }

  // =======================================
  // FREE TEST
  // =======================================

  if (!snapshot.isPaid) {
    const [
      trial,
      subscription,
    ] = await Promise.all([
      getTrialStatus(
        studentId,
        now
      ),
      getActiveSubscription(
        studentId,
        now
      ),
    ]);

    return {
      allowed: true,
      reason: "FREE",
      trial,
      subscription,
      individualPurchase: false,
    };
  }

  // =======================================
  // TRIAL
  // =======================================

  const trial =
    await getTrialStatus(
      studentId,
      now
    );

  if (trial.active) {
    return {
      allowed: true,
      reason: "TRIAL",
      trial,
      subscription: null,
      individualPurchase: false,
    };
  }

  // =======================================
  // ACTIVE SUBSCRIPTION
  // =======================================

  const subscription =
    await getActiveSubscription(
      studentId,
      now
    );

  if (subscription) {
    return {
      allowed: true,
      reason: "SUBSCRIPTION",
      trial,
      subscription,
      individualPurchase: false,
    };
  }

  // =======================================
  // OLD INDIVIDUAL PURCHASE
  // =======================================

  const individualPurchase =
    await hasIndividualPurchase(
      studentId,
      snapshotId
    );

  if (individualPurchase) {
    return {
      allowed: true,
      reason: "INDIVIDUAL_PURCHASE",
      trial,
      subscription: null,
      individualPurchase: true,
    };
  }

  // =======================================
  // NO ACCESS
  // =======================================

  return {
    allowed: false,
    reason: "SUBSCRIPTION_REQUIRED",
    trial,
    subscription: null,
    individualPurchase: false,
  };
};

// =========================================
// STUDENT ACCESS STATUS
// =========================================

const getStudentAccessStatus = async (
  studentId,
  now = new Date()
) => {
  const [
    trial,
    subscription,
  ] = await Promise.all([
    getTrialStatus(
      studentId,
      now
    ),
    getActiveSubscription(
      studentId,
      now
    ),
  ]);

  return {
    trial,

    subscription: subscription
      ? {
          id: subscription._id,
          plan: subscription.plan,
          amount: subscription.amount,
          currency:
            subscription.currency,
          startDate:
            subscription.startDate,
          endDate:
            subscription.endDate,
          status:
            subscription.status,
        }
      : null,

    premiumAccess:
      trial.active ||
      Boolean(subscription),

    accessType: trial.active
      ? "TRIAL"
      : subscription
        ? "SUBSCRIPTION"
        : "NONE",
  };
};

// =========================================
// EXPORT
// =========================================

module.exports = {
  TRIAL_DAYS,
  getTrialStatus,
  getActiveSubscription,
  hasIndividualPurchase,
  hasPremiumAccess,
  getStudentAccessStatus,
};