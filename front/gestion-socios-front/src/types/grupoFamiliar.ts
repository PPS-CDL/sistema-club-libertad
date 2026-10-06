import type { Persona } from "./persona";

export interface GrupoFamiliar {
  id: string | number;
  nombre: string;
  responsable: Persona; // Persona que es responsable del grupo familiar
  integrantes: Persona[]; // Lista de integrantes del grupo familiar
}

export interface GrupoFamiliarDTO {
  responsableId: number;
  integrantesIds: number[];
}
