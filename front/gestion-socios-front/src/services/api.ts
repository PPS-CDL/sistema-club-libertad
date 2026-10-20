import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8080/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ConfiguracionClubDTO {
  importeCuotaIndividual: number;
  importeCuotaFamiliar: number;
  fechaEfectiva: string | null; // Formato "YYYY-MM-DD"
}
export const configuracionService = {
  get: () => api.get("/configuracion"),
  update: (data: ConfiguracionClubDTO) => api.put("/configuracion", data),
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
