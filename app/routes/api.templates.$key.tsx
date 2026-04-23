import type { Route } from "./+types/api.templates.$key";
import { getTemplateBySlugOrId } from "~/lib/db.server";
import { jsonResponse, optionsResponse } from "~/lib/json.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }
  const key = params.key;
  if (!key) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }
  const template = getTemplateBySlugOrId(key);
  if (!template) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }
  return jsonResponse({ template });
}

export default function ApiTemplateResource() {
  return null;
}
