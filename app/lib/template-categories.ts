export const TEMPLATE_CATEGORIES = [
  "admin",
  "broadcast",
  "events",
  "social",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export type CategoryFilter = "all" | TemplateCategory;

export function formatCategoryLabel(
  category: TemplateCategory | Exclude<CategoryFilter, "all">,
): string {
  return category.slice(0, 1).toUpperCase() + category.slice(1);
}

export function isTemplateCategory(value: string): value is TemplateCategory {
  return (TEMPLATE_CATEGORIES as readonly string[]).includes(value);
}

export function parseTemplateCategory(value: string): TemplateCategory {
  const trimmed = value.trim();
  return isTemplateCategory(trimmed) ? trimmed : "admin";
}

export function parseCategoryFilter(value: string | null): CategoryFilter {
  if (value === "all") return "all";
  if (value != null && isTemplateCategory(value)) return value;
  return "admin";
}
