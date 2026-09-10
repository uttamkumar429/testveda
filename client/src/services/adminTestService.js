import api from "./api";

const adminTestService = {
  // =========================================
  // GET ALL TESTS
  // =========================================

  getTests: async (params = {}) => {
    const response = await api.get(
      "/tests",
      {
        params,
      }
    );

    return response.data;
  },

  // =========================================
  // GET SINGLE TEST
  // =========================================

  getTestById: async (id) => {
    const response = await api.get(
      `/tests/${id}`
    );

    return response.data;
  },

  // =========================================
  // CREATE TEST
  // =========================================

  createTest: async (data) => {
    const response = await api.post(
      "/tests",
      data
    );

    return response.data;
  },

  // =========================================
  // UPDATE TEST
  // =========================================

  updateTest: async (
    id,
    data
  ) => {
    const response = await api.put(
      `/tests/${id}`,
      data
    );

    return response.data;
  },

  // =========================================
  // DELETE TEST
  // =========================================

  deleteTest: async (id) => {
    const response = await api.delete(
      `/tests/${id}`
    );

    return response.data;
  },

  // =========================================
  // TEST MATERIALS
  // =========================================

  uploadMaterial: async (id, formData) => {
    const response = await api.post(
      `/tests/${id}/materials`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  deleteMaterial: async (id, materialId) => {
    const response = await api.delete(
      `/tests/${id}/materials/${materialId}`
    );

    return response.data;
  },

  // =========================================
  // PUBLISH TEST
  // =========================================

  publishTest: async (id) => {
    const response = await api.post(
      `/tests/${id}/publish`
    );

    return response.data;
  },
};

export default adminTestService;