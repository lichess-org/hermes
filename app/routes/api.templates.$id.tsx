import type { Route } from "./+types/api.templates.$id";
import { getTemplateById } from "~/lib/db.server";
import { jsonResponse, optionsResponse } from "~/lib/json.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }
  const raw = params.id;
  if (!raw || !/^\d+$/.test(raw)) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }
  const template = getTemplateById(Number(raw));
  if (!template) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }
  return jsonResponse({ template });
}
