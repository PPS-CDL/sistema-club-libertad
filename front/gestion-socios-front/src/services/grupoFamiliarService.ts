import api from "./api";
import type { GrupoFamiliar, GrupoFamiliarDTO } from "../types/grupoFamiliar";

const grupoFamiliarService = {
  getAll: () => api.get<GrupoFamiliar[]>("/grupos"),
  getById: (id: string | number) => api.get<GrupoFamiliar>(`/grupos/${id}`),
  create: (data: GrupoFamiliarDTO) => api.post<GrupoFamiliar>("/grupos", data),
  update: (id: string | number, data: GrupoFamiliarDTO) =>
    api.put<GrupoFamiliar>(`/grupos/${id}`, data),
  delete: (id: string | number) => api.delete(`/grupos/${id}`),
};

export default grupoFamiliarService;
