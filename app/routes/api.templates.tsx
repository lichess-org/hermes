import type { Route } from "./+types/api.templates";
import { listTemplates } from "~/lib/db.server";
import { jsonResponse, optionsResponse } from "~/lib/json.server";

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }
  const templates = listTemplates();
  return jsonResponse({ templates });
}

export default function ApiTemplatesResource() {
  return null;
}
