import api from "./api";

const paymentService = {
  // ==========================================
  // EXISTING INDIVIDUAL TEST PAYMENT
  // ==========================================

  async createOrder(snapshotId) {
    const { data } = await api.post(
      "/student/payments/order",
      { snapshotId }
    );

    return data;
  },

  async verifyPayment(payload) {
    const { data } = await api.post(
      "/student/payments/verify",
      payload
    );

    return data;
  },

  // ==========================================
  // SUBSCRIPTION
  // ==========================================

  async createSubscriptionOrder() {
    const { data } = await api.post(
      "/student/payments/subscription/order"
    );

    return data;
  },

  async verifySubscriptionPayment(payload) {
    const { data } = await api.post(
      "/student/payments/subscription/verify",
      payload
    );

    return data;
  },

  async getSubscriptionStatus() {
    const { data } = await api.get(
      "/student/payments/subscription/status"
    );

    return data;
  },
};

export default paymentService;