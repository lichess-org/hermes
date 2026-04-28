import type { Route } from "./+types/api.templates";
import { listTemplates } from "~/lib/db.server";
import { jsonResponse, optionsResponse } from "~/lib/json.server";

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }
  const rawCategory = new URL(request.url).searchParams.get("category");
  const category =
    rawCategory === "admin" || rawCategory === "broadcast"
      ? rawCategory
      : undefined;
  const templates = listTemplates(category);
  return jsonResponse({ templates });
}
