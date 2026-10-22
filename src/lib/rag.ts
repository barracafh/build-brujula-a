// TODO(Saúl): el RAG del índice de trámites (docs/index_specification.md en la
// rama indexacion-valencia). Recibe lenguaje natural y devuelve los `k`
// fragmentos más parecidos, cada uno con el id de su entrada del catálogo.
// Mientras sea null, el agente no ofrece la herramienta `buscar_tramites`.
export type Fragmento = { id: string; texto: string; puntuacion: number };

export const buscar: ((consulta: string, k?: number) => Promise<Fragmento[]>) | null =
  null;
