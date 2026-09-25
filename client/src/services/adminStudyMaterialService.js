import api from "./api";

const adminStudyMaterialService = {
  getMaterials: async (
    params = {}
  ) => {
    return api.get(
      "/admin/study-materials",
      {
        params,
      }
    );
  },

  uploadMaterial: async (
    formData
  ) => {
    return api.post(
      "/admin/study-materials",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  deleteMaterial: async (id) => {
    return api.delete(
      `/admin/study-materials/${id}`
    );
  },
};

export default adminStudyMaterialService;