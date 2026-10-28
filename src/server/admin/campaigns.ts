import { z } from "zod";
import { database } from "../database/client";
export const campaignSchema = z.object({
  title: z.string().trim().min(3).max(100),
  event_date: z.iso.date(),
  catalog_slug: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .max(200)
    .default(""),
  notes: z.string().trim().max(1000).default(""),
});
export type Campaign = {
  id: string;
  title: string;
  event_date: string;
  catalog_slug: string;
  notes: string;
  status: string;
};
export async function readCampaigns() {
  if (!process.env.DATABASE_URL)
    return { items: [] as Campaign[], ready: false };
  try {
    const { rows } = await database().query<Campaign>(
      "SELECT id,title,event_date::text,catalog_slug,notes,status FROM pitterpan_admin_campaigns ORDER BY event_date,id LIMIT 200",
    );
    return { items: rows, ready: true };
  } catch {
    return { items: [] as Campaign[], ready: false };
  }
}
