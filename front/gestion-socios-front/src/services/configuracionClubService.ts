import api from "./api";
import type { ConfiguracionClub } from "../types/configuracionClub";

const configuracionClubService = {
  get: () => api.get<ConfiguracionClub>("/configuracion"),
  update: (data: ConfiguracionClub) =>
    api.put<ConfiguracionClub>("/configuracion", data),
};

export default configuracionClubService;
