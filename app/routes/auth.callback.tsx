import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { exchangeCodeForUser } from "~/lib/authentik.server";
import { commitSession, getSession } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const session = await getSession(request);
  const oauth = session.get("oauth");

  if (!code || !state || !oauth || oauth.state !== state) {
    session.unset("oauth");
    throw redirect("/?error=state", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  try {
    const user = await exchangeCodeForUser(code);
    session.set("user", user);
    session.unset("oauth");
    const returnTo = oauth.returnTo ?? "/admin";
    const safe =
      returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/admin";
    throw redirect(safe, {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    session.unset("oauth");
    const message =
      err instanceof Error ? err.message : "Sign-in failed.";
    throw redirect(
      `/?error=auth&message=${encodeURIComponent(message)}`,
      {
        headers: { "Set-Cookie": await commitSession(session) },
      },
    );
  }
}

export default function AuthCallback() {
  return null;
}
