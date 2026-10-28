import { database } from "../database/client";
import { z } from "zod";
import { roles } from "../auth/crypto";
export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  role: z.enum(roles),
  password: z.string().min(12).max(128),
});
export const userUpdateSchema = z
  .object({
    id: z.uuid(),
    disabled: z.boolean().optional(),
    role: z.enum(roles).optional(),
  })
  .refine((v) => v.disabled !== undefined || v.role !== undefined);
export async function listUsers() {
  const bootstrap = {
    id: "bootstrap",
    name: process.env.ADMIN_NAME || "Administrador",
    email: process.env.ADMIN_EMAIL || "",
    role: "admin",
    disabled: false,
    created_at: null,
  };
  if (!process.env.DATABASE_URL) return { users: [bootstrap], ready: false };
  try {
    const { rows } = await database().query<{
      id: string;
      name: string;
      email: string;
      role: string;
      disabled: boolean;
      created_at: string;
    }>(
      "SELECT id,name,email,role,disabled,created_at::text FROM pitterpan_admin_users ORDER BY created_at",
    );
    return { users: [bootstrap, ...rows], ready: true };
  } catch {
    return { users: [bootstrap], ready: false };
  }
}
