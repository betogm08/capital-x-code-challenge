export type ClientStatus = "pendiente" | "aprobado";

export interface Client {
  id: number;
  razon_social: string;
  rfc: string;
  email: string;
  estatus: ClientStatus;
  created_at: string;
}
