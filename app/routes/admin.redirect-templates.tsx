import { redirect } from "react-router";
import type { Route } from "./+types/admin.redirect-templates";

export function loader({}: Route.LoaderArgs) {
  throw redirect("/admin");
}

export default function AdminTemplatesRedirect() {
  return null;
}
