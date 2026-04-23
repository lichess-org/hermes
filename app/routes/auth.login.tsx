import crypto from "node:crypto";
import { redirect } from "react-router";
import type { Route } from "./+types/auth.login";
import { buildAuthorizationUrl } from "~/lib/authentik.server";
import { commitSession, getSession } from "~/lib/session.server";

function safeReturnTo(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/admin";
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("redirect"));

  const session = await getSession(request);
  if (session.get("user")) {
    throw redirect(returnTo);
  }

  const state = crypto.randomBytes(16).toString("hex");
  session.set("oauth", { state, returnTo });

  const authorizeUrl = await buildAuthorizationUrl(state);
  throw redirect(authorizeUrl, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function AuthLogin() {
  return null;
}
