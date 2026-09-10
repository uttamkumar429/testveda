const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const controller = require("../controllers/payment.controller");

router.post(
  "/order",
  protect,
  authorize("student"),
  controller.createOrder
);

router.post(
  "/verify",
  protect,
  authorize("student"),
  controller.verify
);
router.post(
  "/subscription/order",
  protect,
  authorize("student"),
  controller.createSubscriptionOrder
);

router.post(
  "/subscription/verify",
  protect,
  authorize("student"),
  controller.verifySubscription
);

router.get(
  "/subscription/status",
  protect,
  authorize("student"),
  controller.getSubscriptionStatus
);

module.exports = router;
