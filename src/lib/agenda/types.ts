export type Supplier = {
  id: string;
  code: string;
  name: string;
  trade_name: string;
  state: string;
  contact: string;
  phone: string;
  email: string;
  catalog_url: string;
  revision: number;
  updated_at: string;
};
export type Appointment = {
  id: string;
  supplier_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  location: string;
  video_url: string;
  description: string;
  owner: string;
  revision: number;
};
export type Note = {
  id: string;
  supplier_id: string | null;
  title: string;
  body: string;
  owner: string;
  updated_at: string;
  revision: number;
};
export type Workspace = {
  suppliers: Supplier[];
  appointments: Appointment[];
  notes: Note[];
};
