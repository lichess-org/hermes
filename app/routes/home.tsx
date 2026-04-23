import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hermes — shared email templates" },
    {
      name: "description",
      content:
        "Public email template catalog with an Authentik-protected admin editor.",
    },
  ];
}

const errorCopy: Record<string, string> = {
  state: "Your sign-in session expired or was invalid. Please try again.",
  auth: "Sign-in failed. Check Authentik configuration and try again.",
};

export default function Home() {
  const [params] = useSearchParams();
  const errorKey = params.get("error");
  const detail = params.get("message");
  const errorMessage =
    errorKey && errorCopy[errorKey]
      ? `${errorCopy[errorKey]}${detail ? ` (${detail})` : ""}`
      : errorKey
        ? "Something went wrong during sign-in."
        : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-zinc-950 to-zinc-950" />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-10 px-6 py-20 sm:py-28">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500/90">
            Hermes
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Shared email templates
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400">
            One catalog for your organization: templates are{" "}
            <strong className="font-medium text-zinc-200">public to read</strong>{" "}
            and{" "}
            <strong className="font-medium text-zinc-200">
              editable only when signed in
            </strong>{" "}
            with Authentik.
          </p>
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/templates"
            className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-white hover:border-zinc-500"
          >
            View JSON API
          </a>
          <Link
            to="/auth/login?redirect=/admin"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Admin sign-in
          </Link>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            API
          </h2>
          <ul className="space-y-2 font-mono text-xs text-zinc-400">
            <li>
              <span className="text-emerald-500/90">GET</span>{" "}
              <code className="text-zinc-300">/api/templates</code> — list all
            </li>
            <li>
              <span className="text-emerald-500/90">GET</span>{" "}
              <code className="text-zinc-300">/api/templates/:slug-or-id</code> —
              single template
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
