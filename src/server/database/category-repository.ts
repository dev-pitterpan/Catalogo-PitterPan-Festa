import { departmentHandles } from "../../lib/catalog/departments.ts";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { activeSnapshot, type SqlClient } from "./catalog-repository.ts";
const navigationSchema = z
  .object({
    departments: z.array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .refine((id) => id !== "outros"),
        label: z.string().min(1),
        categories: z.array(z.string().min(1)),
      }),
    ),
  })
  .superRefine((value, context) => {
    const ids = new Set<string>(),
      categories = new Set<string>();
    for (const department of value.departments) {
      if (ids.has(department.id))
        context.addIssue({ code: "custom", message: "Departamento duplicado" });
      ids.add(department.id);
      for (const category of department.categories) {
        if (categories.has(category))
          context.addIssue({
            code: "custom",
            message: "Categoria em dois departamentos",
          });
        categories.add(category);
      }
    }
  });
export async function categoryPage(
  db: SqlClient,
  slug: string,
  search: string,
  department: string,
  page: number,
) {
  const settings = navigationSchema.parse(
    JSON.parse(
      await readFile(
        join(process.cwd(), "config", "catalog-departments.json"),
        "utf8",
      ),
    ),
  );
  const snapshot = await activeSnapshot(db);
  const all = await db.query<{ category: string; total: string }>(
    "SELECT category,count(*)::text AS total FROM catalog_items WHERE import_id=$1 AND ($2::text[] IS NULL OR collections && $2::text[]) GROUP BY category ORDER BY category",
    [
      snapshot,
      slug === "todos"
        ? null
        : [...new Set([slug, ...departmentHandles(slug)])],
    ],
  );
  const configured = new Set(
    settings.departments.flatMap((item) => item.categories),
  );
  const groups = [
    ...settings.departments,
    {
      id: "outros",
      label: settings.departments.length ? "Outras categorias" : "Categorias",
      categories: all.rows
        .filter((item) => !configured.has(item.category))
        .map((item) => item.category),
    },
  ];
  const totals = new Map(
    all.rows.map((item) => [item.category, Number(item.total)]),
  );
  const departments = groups
    .map((group) => ({
      ...group,
      count: group.categories.reduce(
        (total, category) => total + (totals.get(category) || 0),
        0,
      ),
    }))
    .filter((group) => group.count > 0);
  const allowed = department
    ? new Set(
        departments.find((item) => item.id === department)?.categories || [],
      )
    : null;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = all.rows.filter(
    (item) =>
      (!allowed || allowed.has(item.category)) &&
      normalize(item.category).includes(normalize(search)),
  );
  return {
    departments: departments.map(({ id, label, count }) => ({
      id,
      label,
      count,
    })),
    categories: filtered
      .slice((page - 1) * 30, page * 30)
      .map((item) => ({ name: item.category, count: Number(item.total) })),
    page,
    pages: Math.max(1, Math.ceil(filtered.length / 30)),
    total: filtered.length,
  };
}
