import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hermes — Lichess email templates" },
    {
      name: "description",
      content: "Hermes: email templates for the lichess-gmail extension",
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-emerald-950/40 via-zinc-950 to-zinc-950" />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-10 px-6 py-20 sm:py-28">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500/90">
            Hermes
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Lichess email templates
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400">
            <strong className="font-medium text-zinc-200">
              Add, change, and delete templates
            </strong>{" "}
            after signing in with Authentik.
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
            View email templates
          </a>
          <Link
            to="/auth/login?redirect=/admin"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Sign in to edit
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
              <code className="text-zinc-300">/api/templates/:id</code> — single
              template (numeric id)
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
