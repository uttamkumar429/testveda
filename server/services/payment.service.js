const crypto = require("crypto");
const mongoose = require("mongoose");
const TestSnapshot = require("../models/TestSnapshot");
const TestPurchase = require("../models/TestPurchase");
const Subscription = require("../models/Subscription");
const PaymentWebhookEvent = require("../models/PaymentWebhookEvent");
const ApiError = require("../utils/ApiError");
const {
  getStudentAccessStatus,
} = require("./access.service");

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";
const RAZORPAY_API_TIMEOUT_MS = Math.max(
  3000,
  Number(process.env.RAZORPAY_API_TIMEOUT_MS || 10000)
);
const ORDER_CREATION_LOCK_MS = 30000;

const isMockMode = () =>
  String(process.env.PAYMENT_MODE || "razorpay").toLowerCase() === "mock";

const getRazorpayConfig = () => {
  if (isMockMode()) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        500,
        "Mock payment mode is disabled in production."
      );
    }

    return {
      keyId: "mock_key",
      keySecret: "mock_secret",
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new ApiError(
      503,
      "Payment service is not configured."
    );
  }

  return { keyId, keySecret };
};

const getWebhookSecret = () => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new ApiError(
      503,
      "Payment webhook is not configured."
    );
  }

  return secret;
};

const toPaise = (amountRupees) => {
  const amount = Number(amountRupees);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Invalid payment amount.");
  }

  const paise = Math.round(amount * 100);

  if (!Number.isSafeInteger(paise) || paise <= 0) {
    throw new ApiError(400, "Invalid payment amount.");
  }

  return paise;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const safeTimingCompare = (expected, actual) => {
  if (
    typeof expected !== "string" ||
    typeof actual !== "string" ||
    expected.length !== actual.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(actual, "utf8")
  );
};

const razorpayRequest = async (method, path, body) => {
  const { keyId, keySecret } = getRazorpayConfig();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    RAZORPAY_API_TIMEOUT_MS
  );

  try {
    let response;

    try {
      response = await fetch(`${RAZORPAY_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new ApiError(
          504,
          "Payment gateway request timed out. Please try again."
        );
      }

      throw new ApiError(
        502,
        "Unable to reach the payment gateway. Please try again."
      );
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(
        502,
        data?.error?.description ||
          "Payment gateway request failed."
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const getSubscriptionConfig = () => {
  const price = Number(
    process.env.SUBSCRIPTION_PRICE || 499
  );
  const days = Number(
    process.env.SUBSCRIPTION_DAYS || 30
  );
  const currency = String(
    process.env.SUBSCRIPTION_CURRENCY || "INR"
  ).toUpperCase();

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(days) ||
    days <= 0 ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    throw new ApiError(
      500,
      "Subscription configuration is invalid."
    );
  }

  return {
    price,
    days: Math.floor(days),
    currency,
  };
};

const getOrder = async (orderId) => {
  return razorpayRequest(
    "GET",
    `/orders/${encodeURIComponent(orderId)}`
  );
};

const getCapturedPaymentForOrder = async (
  orderId,
  expectedAmount,
  expectedCurrency
) => {
  const result = await razorpayRequest(
    "GET",
    `/orders/${encodeURIComponent(orderId)}/payments`
  );

  const expectedPaise = toPaise(expectedAmount);

  return (
    result?.items || []
  ).find(
    (payment) =>
      payment?.status === "captured" &&
      payment?.order_id === orderId &&
      Number(payment?.amount) === expectedPaise &&
      payment?.currency === expectedCurrency
  );
};

const buildTestOrderResponse = (
  purchase,
  snapshot,
  keyId
) => ({
  alreadyPaid: purchase.status === "PAID",
  keyId,
  orderId: purchase.razorpayOrderId,
  amount: toPaise(purchase.amount),
  currency: purchase.currency,
  testSnapshotId: snapshot._id,
  title: snapshot.title,
  mock: false,
});

const markTestPurchasePaid = async (
  purchase,
  razorpayPaymentId
) => {
  if (purchase.status === "PAID") {
    return purchase;
  }

  return TestPurchase.findOneAndUpdate(
    {
      _id: purchase._id,
      status: { $ne: "PAID" },
    },
    {
      $set: {
        status: "PAID",
        razorpayPaymentId,
        failureReason: null,
        orderCreationLockUntil: null,
      },
    },
    { new: true }
  );
};

const createPaymentOrder = async (studentId, snapshotId) => {
  if (
    !mongoose.isValidObjectId(studentId) ||
    !mongoose.isValidObjectId(snapshotId)
  ) {
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
  const amount = toPaise(amountRupees);

  let purchase = await TestPurchase.findOne({
    student: studentId,
    testSnapshot: snapshotId,
  });

  if (purchase?.status === "PAID") {
    return {
      alreadyPaid: true,
      testSnapshotId: snapshotId,
    };
  }

  const { keyId } = getRazorpayConfig();

  if (isMockMode()) {
    if (purchase?.status === "CREATED" && purchase.razorpayOrderId) {
      return {
        alreadyPaid: false,
        mock: true,
        keyId,
        orderId: purchase.razorpayOrderId,
        amount,
        currency: "INR",
        testSnapshotId: snapshotId,
        title: snapshot.title,
      };
    }

    const mockOrderId =
      `mock_order_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;

    if (!purchase) {
      purchase = await TestPurchase.create({
        student: studentId,
        testSnapshot: snapshotId,
        amount: amountRupees,
        currency: "INR",
        status: "CREATED",
        razorpayOrderId: mockOrderId,
      });
    } else {
      purchase.amount = amountRupees;
      purchase.currency = "INR";
      purchase.status = "CREATED";
      purchase.razorpayOrderId = mockOrderId;
      purchase.razorpayPaymentId = null;
      purchase.failureReason = null;
      await purchase.save();
    }

    return {
      alreadyPaid: false,
      mock: true,
      keyId,
      orderId: mockOrderId,
      amount,
      currency: "INR",
      testSnapshotId: snapshotId,
      title: snapshot.title,
    };
  }

  if (purchase?.razorpayOrderId) {
    try {
      const order = await getOrder(purchase.razorpayOrderId);

      if (order?.status === "paid") {
        const capturedPayment =
          await getCapturedPaymentForOrder(
            purchase.razorpayOrderId,
            purchase.amount,
            purchase.currency
          );

        if (capturedPayment) {
          const updated = await markTestPurchasePaid(
            purchase,
            capturedPayment.id
          );

          return {
            alreadyPaid: true,
            testSnapshotId: snapshotId,
            paymentId: updated?.razorpayPaymentId || capturedPayment.id,
          };
        }

        throw new ApiError(
          409,
          "Payment is captured by the gateway but is still being reconciled. Please try again shortly."
        );
      }

      return buildTestOrderResponse(
        purchase,
        snapshot,
        keyId
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 502) {
        throw error;
      }

      // A transient gateway failure should not create another order.
      throw error;
    }
  }

  const lockUntil = new Date(
    Date.now() + ORDER_CREATION_LOCK_MS
  );

  if (!purchase) {
    try {
      purchase = await TestPurchase.create({
        student: studentId,
        testSnapshot: snapshotId,
        amount: amountRupees,
        currency: "INR",
        status: "CREATED",
        razorpayOrderId: null,
        orderCreationLockUntil: lockUntil,
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      purchase = await TestPurchase.findOne({
        student: studentId,
        testSnapshot: snapshotId,
      });

      if (purchase?.razorpayOrderId) {
        return buildTestOrderResponse(
          purchase,
          snapshot,
          keyId
        );
      }

      throw new ApiError(
        409,
        "Payment order is already being created. Please try again shortly."
      );
    }
  } else {
    const locked = await TestPurchase.findOneAndUpdate(
      {
        _id: purchase._id,
        $or: [
          { orderCreationLockUntil: null },
          { orderCreationLockUntil: { $lt: new Date() } },
        ],
        razorpayOrderId: null,
      },
      {
        $set: {
          orderCreationLockUntil: lockUntil,
          amount: amountRupees,
          currency: "INR",
          status: "CREATED",
          failureReason: null,
        },
      },
      { new: true }
    );

    if (!locked) {
      throw new ApiError(
        409,
        "Payment order is already being created. Please try again shortly."
      );
    }

    purchase = locked;
  }

  try {
    const receipt =
      `testveda_${String(studentId).slice(-8)}_${String(snapshotId).slice(-8)}_${Date.now()}`;

    const order = await razorpayRequest(
      "POST",
      "/orders",
      {
        amount,
        currency: "INR",
        receipt: receipt.slice(0, 40),
        notes: {
          testSnapshotId: snapshotId.toString(),
          studentId: studentId.toString(),
          type: "TEST_PURCHASE",
        },
      }
    );

    await TestPurchase.findByIdAndUpdate(
      purchase._id,
      {
        $set: {
          amount: amountRupees,
          currency: "INR",
          status: "CREATED",
          razorpayOrderId: order.id,
          razorpayPaymentId: null,
          pendingKey: `${studentId}:MONTHLY`,
          failureReason: null,
          orderCreationLockUntil: null,
        },
      }
    );

    return {
      alreadyPaid: false,
      mock: false,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      testSnapshotId: snapshotId,
      title: snapshot.title,
    };
  } catch (error) {
    await TestPurchase.findByIdAndUpdate(
      purchase._id,
      {
        $set: {
          status: "FAILED",
          orderCreationLockUntil: null,
          failureReason: error.message,
          pendingKey: null,
        },
      }
    );

    throw error;
  }
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
    return {
      paid: true,
      testSnapshotId: snapshotId,
      paymentId: purchase.razorpayPaymentId,
    };
  }

  if (isMockMode()) {
    const updated = await markTestPurchasePaid(
      purchase,
      razorpayPaymentId
    );

    return {
      paid: true,
      mock: true,
      testSnapshotId: snapshotId,
      paymentId: updated.razorpayPaymentId,
    };
  }

  const { keySecret } = getRazorpayConfig();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${purchase.razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!safeTimingCompare(expectedSignature, razorpaySignature)) {
    throw new ApiError(
      400,
      "Payment signature verification failed."
    );
  }

  const payment = await razorpayRequest(
    "GET",
    `/payments/${encodeURIComponent(razorpayPaymentId)}`
  );

  if (
    payment.order_id !== purchase.razorpayOrderId ||
    payment.status !== "captured" ||
    Number(payment.amount) !== toPaise(purchase.amount) ||
    payment.currency !== purchase.currency
  ) {
    throw new ApiError(
      400,
      "Payment has not been captured or does not match the order."
    );
  }

  const updated = await markTestPurchasePaid(
    purchase,
    razorpayPaymentId
  );

  return {
    paid: true,
    testSnapshotId: snapshotId,
    paymentId: updated?.razorpayPaymentId || razorpayPaymentId,
  };
};

const hasPaidForTest = async (studentId, snapshotId) => {
  if (
    !mongoose.isValidObjectId(studentId) ||
    !mongoose.isValidObjectId(snapshotId)
  ) {
    return false;
  }

  const purchase = await TestPurchase.findOne({
    student: studentId,
    testSnapshot: snapshotId,
    status: "PAID",
  })
    .select("_id")
    .lean();

  return Boolean(purchase);
};

const createSubscriptionOrder = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(400, "Invalid student ID.");
  }

  const config = getSubscriptionConfig();
  const { keyId } = getRazorpayConfig();
  const amount = toPaise(config.price);

  const activeSubscription = await Subscription.findOne({
    student: studentId,
    status: "ACTIVE",
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  })
    .select("_id endDate")
    .lean();

  if (activeSubscription) {
    throw new ApiError(
      409,
      "You already have an active subscription."
    );
  }

  let subscription = await Subscription.findOne({
    student: studentId,
    plan: "MONTHLY",
    status: "PENDING",
  }).sort({ createdAt: -1 });

  if (isMockMode()) {
    if (subscription?.razorpayOrderId) {
      return {
        mock: true,
        subscriptionId: subscription._id,
        orderId: subscription.razorpayOrderId,
        amount: toPaise(subscription.amount),
        currency: subscription.currency,
        keyId,
        plan: subscription.plan,
        durationDays: config.days,
      };
    }

    const mockOrderId =
      `mock_order_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;

    subscription = await Subscription.findOneAndUpdate(
      {
        student: studentId,
        plan: "MONTHLY",
        status: "PENDING",
      },
      {
        $set: {
          amount: config.price,
          currency: config.currency,
          razorpayOrderId: mockOrderId,
          razorpayPaymentId: null,
          pendingKey: `${studentId}:MONTHLY`,
          failureReason: null,
        },
      },
      { new: true }
    );

    if (!subscription) {
      subscription = await Subscription.create({
        student: studentId,
        plan: "MONTHLY",
        amount: config.price,
        currency: config.currency,
        status: "PENDING",
        razorpayOrderId: mockOrderId,
        pendingKey: `${studentId}:MONTHLY`,
      });
    }

    return {
      mock: true,
      subscriptionId: subscription._id,
      orderId: mockOrderId,
      amount,
      currency: config.currency,
      keyId,
      plan: "MONTHLY",
      durationDays: config.days,
    };
  }


  if (subscription?.razorpayOrderId) {
    const order = await getOrder(subscription.razorpayOrderId);

    if (order?.status === "paid") {
      const capturedPayment =
        await getCapturedPaymentForOrder(
          subscription.razorpayOrderId,
          subscription.amount,
          subscription.currency
        );

      if (capturedPayment) {
        const activated = await activateSubscription(
          subscription,
          capturedPayment.id,
          config.days
        );

        return {
          subscriptionId: activated._id,
          orderId: subscription.razorpayOrderId,
          amount,
          currency: config.currency,
          keyId,
          plan: "MONTHLY",
          durationDays: config.days,
          reconciled: true,
          mock: false,
        };
      }

      throw new ApiError(
        409,
        "Payment is captured by the gateway but is still being reconciled. Please try again shortly."
      );
    }

    return {
      subscriptionId: subscription._id,
      orderId: subscription.razorpayOrderId,
      amount: toPaise(subscription.amount),
      currency: subscription.currency,
      keyId,
      plan: subscription.plan,
      durationDays: config.days,
      mock: false,
    };
  }


  if (!subscription) {
    try {
      subscription = await Subscription.create({
        student: studentId,
        plan: "MONTHLY",
        amount: config.price,
        currency: config.currency,
        status: "PENDING",
        razorpayOrderId: null,
        pendingKey: `${studentId}:MONTHLY`,
        orderCreationLockUntil: new Date(
          Date.now() + ORDER_CREATION_LOCK_MS
        ),
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      subscription = await Subscription.findOne({
        student: studentId,
        plan: "MONTHLY",
        status: "PENDING",
      }).sort({ createdAt: -1 });

      if (subscription?.razorpayOrderId) {
        return {
          subscriptionId: subscription._id,
          orderId: subscription.razorpayOrderId,
          amount: toPaise(subscription.amount),
          currency: subscription.currency,
          keyId,
          plan: subscription.plan,
          durationDays: config.days,
          mock: false,
        };
      }

      throw new ApiError(
        409,
        "Subscription order is already being created. Please try again shortly."
      );
    }
  } else {
    const locked = await Subscription.findOneAndUpdate(
      {
        _id: subscription._id,
        razorpayOrderId: null,
        $or: [
          { orderCreationLockUntil: null },
          { orderCreationLockUntil: { $lt: new Date() } },
        ],
      },
      {
        $set: {
          amount: config.price,
          currency: config.currency,
          orderCreationLockUntil: new Date(
            Date.now() + ORDER_CREATION_LOCK_MS
          ),
        },
      },
      { new: true }
    );

    if (!locked) {
      throw new ApiError(
        409,
        "Subscription order is already being created. Please try again shortly."
      );
    }

    subscription = locked;
  }

  try {
    const receipt =
      `sub_${String(studentId).slice(-8)}_${Date.now()}`;

    const order = await razorpayRequest(
      "POST",
      "/orders",
      {
        amount,
        currency: config.currency,
        receipt: receipt.slice(0, 40),
        notes: {
          studentId: String(studentId),
          type: "MONTHLY_SUBSCRIPTION",
          subscriptionId: String(subscription._id),
        },
      }
    );

    await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        $set: {
          amount: config.price,
          currency: config.currency,
          status: "PENDING",
          razorpayOrderId: order.id,
          razorpayPaymentId: null,
          pendingKey: `${studentId}:MONTHLY`,
          failureReason: null,
          orderCreationLockUntil: null,
        },
      }
    );

    return {
      subscriptionId: subscription._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan: "MONTHLY",
      durationDays: config.days,
      mock: false,
    };
  } catch (error) {
    await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        $set: {
          status: "FAILED",
          orderCreationLockUntil: null,
          failureReason: error.message,
          pendingKey: null,
        },
      }
    );

    throw error;
  }
};

const activateSubscription = async (
  subscription,
  razorpayPaymentId,
  durationDays
) => {
  if (
    subscription.status === "ACTIVE" &&
    subscription.razorpayPaymentId === razorpayPaymentId
  ) {
    return subscription;
  }

  if (subscription.status === "ACTIVE") {
    throw new ApiError(
      409,
      "Subscription is already active."
    );
  }

  const startDate = new Date();
  const endDate = addDays(startDate, durationDays);

  const updated = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: { $ne: "ACTIVE" },
    },
    {
      $set: {
        status: "ACTIVE",
        startDate,
        endDate,
        razorpayPaymentId,
        activatedAt: startDate,
        failureReason: null,
        orderCreationLockUntil: null,
      },
    },
    { new: true }
  );

  if (!updated) {
    const current = await Subscription.findById(
      subscription._id
    );

    if (
      current?.status === "ACTIVE" &&
      current.razorpayPaymentId === razorpayPaymentId
    ) {
      return current;
    }

    throw new ApiError(
      409,
      "Subscription could not be activated safely."
    );
  }

  return updated;
};

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

  const config = getSubscriptionConfig();

  if (isMockMode()) {
    const activated = await activateSubscription(
      subscription,
      razorpayPaymentId || `mock_payment_${Date.now()}`,
      config.days
    );

    return {
      mock: true,
      subscriptionId: activated._id,
      plan: activated.plan,
      amount: activated.amount,
      currency: activated.currency,
      status: activated.status,
      startDate: activated.startDate,
      endDate: activated.endDate,
    };
  }

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

  if (!safeTimingCompare(expectedSignature, razorpaySignature)) {
    throw new ApiError(
      400,
      "Payment signature verification failed."
    );
  }

  const payment = await razorpayRequest(
    "GET",
    `/payments/${encodeURIComponent(razorpayPaymentId)}`
  );

  if (
    payment.order_id !== subscription.razorpayOrderId ||
    payment.status !== "captured" ||
    Number(payment.amount) !== toPaise(subscription.amount) ||
    payment.currency !== subscription.currency
  ) {
    throw new ApiError(
      400,
      "Payment has not been captured or does not match the subscription."
    );
  }

  const activated = await activateSubscription(
    subscription,
    razorpayPaymentId,
    config.days
  );

  return {
    subscriptionId: activated._id,
    plan: activated.plan,
    amount: activated.amount,
    currency: activated.currency,
    status: activated.status,
    startDate: activated.startDate,
    endDate: activated.endDate,
  };
};

const getSubscriptionStatus = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(400, "Invalid student ID.");
  }

  const access = await getStudentAccessStatus(studentId);
  const config = getSubscriptionConfig();

  return {
    active: Boolean(access.subscription),
    premiumAccess: Boolean(access.premiumAccess),
    accessType: access.accessType,
    trial: access.trial,
    subscription: access.subscription,
    plan: {
      name: "MONTHLY",
      amount: config.price,
      currency: config.currency,
      durationDays: config.days,
    },
  };
};

const processCapturedPayment = async (payment) => {
  const orderId = payment?.order_id;

  if (!orderId || payment?.status !== "captured") {
    return { handled: false };
  }

  const testPurchase = await TestPurchase.findOne({
    razorpayOrderId: orderId,
  });

  if (testPurchase) {
    if (
      Number(payment.amount) !== toPaise(testPurchase.amount) ||
      payment.currency !== testPurchase.currency
    ) {
      throw new ApiError(
        400,
        "Webhook payment amount does not match the test purchase."
      );
    }

    await markTestPurchasePaid(
      testPurchase,
      payment.id
    );

    return { handled: true, type: "TEST_PURCHASE" };
  }

  const subscription = await Subscription.findOne({
    razorpayOrderId: orderId,
  });

  if (subscription) {
    if (
      Number(payment.amount) !== toPaise(subscription.amount) ||
      payment.currency !== subscription.currency
    ) {
      throw new ApiError(
        400,
        "Webhook payment amount does not match the subscription."
      );
    }

    const config = getSubscriptionConfig();
    await activateSubscription(
      subscription,
      payment.id,
      config.days
    );

    return { handled: true, type: "SUBSCRIPTION" };
  }

  return { handled: false };
};

const processFailedPayment = async (payment) => {
  const orderId = payment?.order_id;

  if (!orderId) {
    return { handled: false };
  }

  const testPurchase = await TestPurchase.findOneAndUpdate(
    {
      razorpayOrderId: orderId,
      status: { $ne: "PAID" },
    },
    {
      $set: {
        status: "FAILED",
        failureReason:
          payment?.error_description ||
          payment?.error_reason ||
          "Payment failed.",
      },
    },
    { new: true }
  );

  if (testPurchase) {
    return { handled: true, type: "TEST_PURCHASE" };
  }

  const subscription = await Subscription.findOneAndUpdate(
    {
      razorpayOrderId: orderId,
      status: { $ne: "ACTIVE" },
    },
    {
      $set: {
        status: "FAILED",
        pendingKey: null,
        failureReason:
          payment?.error_description ||
          payment?.error_reason ||
          "Payment failed.",
      },
    },
    { new: true }
  );

  return subscription
    ? { handled: true, type: "SUBSCRIPTION" }
    : { handled: false };
};

const processRazorpayWebhook = async (
  rawBody,
  signature,
  eventId,
  event,
  payload
) => {
  if (!Buffer.isBuffer(rawBody) || !rawBody.length) {
    throw new ApiError(400, "Invalid webhook payload.");
  }

  const webhookSecret = getWebhookSecret();
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (!safeTimingCompare(expectedSignature, signature)) {
    throw new ApiError(401, "Invalid payment webhook signature.");
  }

  if (!eventId) {
    throw new ApiError(400, "Missing payment webhook event ID.");
  }

  let eventRecord;

  try {
    eventRecord = await PaymentWebhookEvent.create({
      eventId,
      event,
      status: "PROCESSING",
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    eventRecord = await PaymentWebhookEvent.findOne({
      eventId,
    });

    if (eventRecord?.status === "PROCESSED") {
      return { duplicate: true };
    }

    if (eventRecord?.status === "PROCESSING") {
      return { duplicate: true };
    }

    eventRecord.status = "PROCESSING";
    eventRecord.lastError = null;
    await eventRecord.save();
  }

  try {
    let result = { handled: false };

    if (
      event === "payment.captured" ||
      event === "order.paid"
    ) {
      const payment =
        payload?.payment?.entity ||
        payload?.order?.entity?.payments?.[0];

      result = await processCapturedPayment(payment);
    } else if (event === "payment.failed") {
      result = await processFailedPayment(
        payload?.payment?.entity
      );
    }

    eventRecord.status = "PROCESSED";
    eventRecord.processedAt = new Date();
    eventRecord.lastError = null;
    await eventRecord.save();

    return result;
  } catch (error) {
    eventRecord.status = "FAILED";
    eventRecord.lastError = String(error?.message || error);
    await eventRecord.save();
    throw error;
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  hasPaidForTest,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getSubscriptionStatus,
  processRazorpayWebhook,
};
