const crypto = require("crypto");
const mongoose = require("mongoose");
const TestSnapshot = require("../models/TestSnapshot");
const TestPurchase = require("../models/TestPurchase");
const Subscription = require("../models/Subscription");
const ApiError = require("../utils/ApiError");

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (process.env.PAYMENT_MODE === "mock") {
    return {
      keyId: "mock_key",
      keySecret: "mock_secret",
    };
  }

  if (!keyId || !keySecret) {
    throw new ApiError(
      503,
      "Payment service is not configured."
    );
  }

  return { keyId, keySecret };
};

const razorpayRequest = async (method, path, body) => {
  const { keyId, keySecret } = getRazorpayConfig();

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      data?.error?.description || "Payment gateway request failed."
    );
  }

  return data;
};

const createPaymentOrder = async (studentId, snapshotId) => {
  if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(snapshotId)) {
    throw new ApiError(400, "Invalid payment request.");
  }

  const snapshot = await TestSnapshot.findById(snapshotId)
    .select("_id title isPaid price startTime endTime")
    .lean();

  if (!snapshot) {
    throw new ApiError(404, "Test not found.");
  }

  if (!snapshot.isPaid) {
    throw new ApiError(400, "This test is free.");
  }

  const amountRupees = Number(snapshot.price);

  if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
    throw new ApiError(400, "Invalid test price.");
  }

  const existing = await TestPurchase.findOne({
    student: studentId,
    testSnapshot: snapshotId,
  });

  if (existing?.status === "PAID") {
    return {
      alreadyPaid: true,
      testSnapshotId: snapshotId,
    };
  }

  const amount = Math.round(amountRupees * 100);
  const receipt = `testveda_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const order = await razorpayRequest("POST", "/orders", {
    amount,
    currency: "INR",
    receipt,
    notes: {
      testSnapshotId: snapshotId.toString(),
      studentId: studentId.toString(),
    },
  });

  await TestPurchase.findOneAndUpdate(
    { student: studentId, testSnapshot: snapshotId },
    {
      student: studentId,
      testSnapshot: snapshotId,
      amount: amountRupees,
      currency: "INR",
      status: "CREATED",
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  const { keyId } = getRazorpayConfig();

  return {
    alreadyPaid: false,
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    testSnapshotId: snapshotId,
    title: snapshot.title,
  };
};

const verifyPayment = async (
  studentId,
  snapshotId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  if (
    !mongoose.isValidObjectId(studentId) ||
    !mongoose.isValidObjectId(snapshotId) ||
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature
  ) {
    throw new ApiError(400, "Invalid payment verification request.");
  }

  const purchase = await TestPurchase.findOne({
    student: studentId,
    testSnapshot: snapshotId,
    razorpayOrderId,
  });

  if (!purchase) {
    throw new ApiError(404, "Payment order not found.");
  }

  if (purchase.status === "PAID") {
    return { paid: true, testSnapshotId: snapshotId };
  }

  const { keySecret } = getRazorpayConfig();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${purchase.razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (
    typeof razorpaySignature !== "string" ||
    razorpaySignature.length !== expectedSignature.length
  ) {
    throw new ApiError(400, "Invalid payment signature.");
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );

  if (!valid) {
    throw new ApiError(400, "Payment signature verification failed.");
  }

  const payment = await razorpayRequest(
    "GET",
    `/payments/${encodeURIComponent(razorpayPaymentId)}`
  );

  if (
    payment.order_id !== purchase.razorpayOrderId ||
    payment.status !== "captured" ||
    Number(payment.amount) !== Math.round(Number(purchase.amount) * 100) ||
    payment.currency !== "INR"
  ) {
    throw new ApiError(400, "Payment has not been captured or does not match the order.");
  }

  purchase.status = "PAID";
  purchase.razorpayPaymentId = razorpayPaymentId;
  await purchase.save();

  return {
    paid: true,
    testSnapshotId: snapshotId,
    paymentId: razorpayPaymentId,
  };
};

const hasPaidForTest = async (studentId, snapshotId) => {
  if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(snapshotId)) {
    return false;
  }

  const purchase = await TestPurchase.findOne({
    student: studentId,
    testSnapshot: snapshotId,
    status: "PAID",
  }).select("_id").lean();

  return Boolean(purchase);
};
// =====================================
// SUBSCRIPTION CONFIG
// =====================================

const SUBSCRIPTION_PRICE = Math.max(
  0,
  Number(process.env.SUBSCRIPTION_PRICE || 499)
);

const SUBSCRIPTION_DAYS = Math.max(
  1,
  Number(process.env.SUBSCRIPTION_DAYS || 30)
);

const SUBSCRIPTION_CURRENCY = (
  process.env.SUBSCRIPTION_CURRENCY || "INR"
).toUpperCase();


// =====================================
// CREATE SUBSCRIPTION ORDER
// =====================================

const createSubscriptionOrder = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(400, "Invalid student ID.");
  }
    // =====================================
  // DEVELOPMENT MOCK PAYMENT
  // =====================================

  if (process.env.PAYMENT_MODE === "mock") {
    const mockOrderId =
      `mock_order_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;

    const subscription = await Subscription.create({
      student: studentId,
      plan: "MONTHLY",
      amount: SUBSCRIPTION_PRICE,
      currency: SUBSCRIPTION_CURRENCY,
      status: "PENDING",
      razorpayOrderId: mockOrderId,
    });

    return {
      mock: true,
      subscriptionId: subscription._id,
      orderId: mockOrderId,
      amount: Math.round(SUBSCRIPTION_PRICE * 100),
      currency: SUBSCRIPTION_CURRENCY,
      keyId: "mock_key",
      plan: "MONTHLY",
      durationDays: SUBSCRIPTION_DAYS,
    };
  }

  if (!SUBSCRIPTION_PRICE) {
    throw new ApiError(
      500,
      "Subscription price is not configured correctly."
    );
  }

  const amount = Math.round(SUBSCRIPTION_PRICE * 100);

  const receipt =
    `sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // Razorpay order
  const order = await razorpayRequest("POST", "/orders", {
    amount,
    currency: SUBSCRIPTION_CURRENCY,
    receipt,
    notes: {
      studentId: String(studentId),
      type: "MONTHLY_SUBSCRIPTION",
    },
  });

  const subscription = await Subscription.create({
    student: studentId,
    plan: "MONTHLY",
    amount: SUBSCRIPTION_PRICE,
    currency: SUBSCRIPTION_CURRENCY,
    status: "PENDING",
    razorpayOrderId: order.id,
  });

  const { keyId } = getRazorpayConfig();

  return {
    subscriptionId: subscription._id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    plan: "MONTHLY",
    durationDays: SUBSCRIPTION_DAYS,
  };
};


// =====================================
// VERIFY SUBSCRIPTION PAYMENT
// =====================================

const verifySubscriptionPayment = async (
  studentId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  if (
    !mongoose.isValidObjectId(studentId) ||
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature
  ) {
    throw new ApiError(
      400,
      "Invalid subscription payment verification request."
    );
  }

  const subscription = await Subscription.findOne({
    student: studentId,
    razorpayOrderId,
  });

  if (!subscription) {
    throw new ApiError(
      404,
      "Subscription order not found."
    );
  }
    // =====================================
  // DEVELOPMENT MOCK PAYMENT
  // =====================================

  if (process.env.PAYMENT_MODE === "mock") {
    const startDate = new Date();

    const endDate = new Date(startDate);
    endDate.setUTCDate(
      endDate.getUTCDate() + SUBSCRIPTION_DAYS
    );

    subscription.status = "ACTIVE";
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.razorpayPaymentId =
      razorpayPaymentId || `mock_payment_${Date.now()}`;
    subscription.activatedAt = startDate;

    await subscription.save();

    return {
      mock: true,
      subscriptionId: subscription._id,
      plan: subscription.plan,
      amount: subscription.amount,
      currency: subscription.currency,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    };
  }

  // Idempotency: payment already processed
  if (
    subscription.status === "ACTIVE" &&
    subscription.razorpayPaymentId === razorpayPaymentId
  ) {
    return {
      subscriptionId: subscription._id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    };
  }

  const { keySecret } = getRazorpayConfig();

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(
      `${subscription.razorpayOrderId}|${razorpayPaymentId}`
    )
    .digest("hex");

  if (
    typeof razorpaySignature !== "string" ||
    razorpaySignature.length !== expectedSignature.length
  ) {
    throw new ApiError(
      400,
      "Invalid payment signature."
    );
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );

  if (!valid) {
    throw new ApiError(
      400,
      "Payment signature verification failed."
    );
  }

  // Verify payment with Razorpay
  const payment = await razorpayRequest(
    "GET",
    `/payments/${encodeURIComponent(razorpayPaymentId)}`
  );

  if (
    payment.order_id !== subscription.razorpayOrderId ||
    payment.status !== "captured" ||
    Number(payment.amount) !==
      Math.round(Number(subscription.amount) * 100) ||
    payment.currency !== subscription.currency
  ) {
    throw new ApiError(
      400,
      "Payment has not been captured or does not match the subscription."
    );
  }

  const startDate = new Date();

  const endDate = new Date(startDate);
  endDate.setUTCDate(
    endDate.getUTCDate() + SUBSCRIPTION_DAYS
  );

  subscription.status = "ACTIVE";
  subscription.startDate = startDate;
  subscription.endDate = endDate;
  subscription.razorpayPaymentId = razorpayPaymentId;
  subscription.activatedAt = startDate;

  await subscription.save();

  return {
    subscriptionId: subscription._id,
    plan: subscription.plan,
    amount: subscription.amount,
    currency: subscription.currency,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
  };
};


// =====================================
// GET SUBSCRIPTION STATUS
// =====================================

const getSubscriptionStatus = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(400, "Invalid student ID.");
  }

  const now = new Date();

  const activeSubscription = await Subscription.findOne({
    student: studentId,
    status: "ACTIVE",
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ endDate: -1 })
    .lean();

  // Mark old subscriptions as expired
  if (!activeSubscription) {
    await Subscription.updateMany(
      {
        student: studentId,
        status: "ACTIVE",
        endDate: { $lt: now },
      },
      {
        $set: {
          status: "EXPIRED",
        },
      }
    );
  }

  return {
    active: Boolean(activeSubscription),
    subscription: activeSubscription
      ? {
          id: activeSubscription._id,
          plan: activeSubscription.plan,
          amount: activeSubscription.amount,
          currency: activeSubscription.currency,
          status: activeSubscription.status,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
        }
      : null,
  };
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  hasPaidForTest,

  createSubscriptionOrder,
  verifySubscriptionPayment,
  getSubscriptionStatus,
};

