import api from "./api";

const studyMaterialService = {
  getMaterials: async (params = {}) => {
    return api.get(
      "/student/study-materials",
      {
        params,
      }
    );
  },

  getMaterialById: async (id) => {
    return api.get(
      `/student/study-materials/${id}`
    );
  },
};

export default studyMaterialService;