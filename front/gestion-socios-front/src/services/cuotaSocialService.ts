import api from "./api";
import type { CuotaSocial } from "../types/cuotaSocial";

export const cuotaSocialService = {
  getAll: () => api.get<CuotaSocial[]>("/cuotas-sociales"),
};

export default cuotaSocialService;
