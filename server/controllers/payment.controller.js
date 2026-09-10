const asyncHandler = require("../middleware/asyncHandler");
const { successResponse } = require("../utils/response");
const {
  createPaymentOrder,
  verifyPayment,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getSubscriptionStatus,
} = require("../services/payment.service");

exports.createOrder = asyncHandler(async (req, res) => {
  const result = await createPaymentOrder(
    req.user._id,
    req.body.snapshotId
  );

  return successResponse(
    res,
    200,
    result.alreadyPaid
      ? "Test is already purchased."
      : "Payment order created successfully.",
    result
  );
});

exports.verify = asyncHandler(async (req, res) => {
  const result = await verifyPayment(
    req.user._id,
    req.body.snapshotId,
    req.body.razorpay_order_id,
    req.body.razorpay_payment_id,
    req.body.razorpay_signature
  );

  return successResponse(
    res,
    200,
    "Payment verified successfully.",
    result
  );
});
// =====================================
// CREATE SUBSCRIPTION ORDER
// =====================================

exports.createSubscriptionOrder = asyncHandler(async (req, res) => {
  const result = await createSubscriptionOrder(req.user._id);

  return successResponse(
    res,
    200,
    "Subscription order created successfully.",
    result
  );
});

// =====================================
// VERIFY SUBSCRIPTION PAYMENT
// =====================================

exports.verifySubscription = asyncHandler(async (req, res) => {
  const result = await verifySubscriptionPayment(
    req.user._id,
    req.body.razorpay_order_id,
    req.body.razorpay_payment_id,
    req.body.razorpay_signature
  );

  return successResponse(
    res,
    200,
    "Subscription activated successfully.",
    result
  );
});

// =====================================
// SUBSCRIPTION STATUS
// =====================================

exports.getSubscriptionStatus = asyncHandler(async (req, res) => {
  const result = await getSubscriptionStatus(req.user._id);

  return successResponse(
    res,
    200,
    "Subscription status fetched successfully.",
    result
  );
});