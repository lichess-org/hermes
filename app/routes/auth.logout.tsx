import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { destroySession, getSession } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  throw redirect("/", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}

export default function AuthLogout() {
  return null;
}
