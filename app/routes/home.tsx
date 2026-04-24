import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hermes Email Templates" },
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
    <main className="relative min-h-dvh text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--tw-gradient-stops))] from-emerald-900/30 via-zinc-950/80 to-zinc-950" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="relative flex min-h-dvh flex-col">
        <div className="flex flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/35 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/5 backdrop-blur-sm sm:rounded-3xl">
              <div className="p-8 sm:p-10">
                <header>
                  <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                    <div className="shrink-0">
                      <img
                        src="/hermes.png"
                        alt=""
                        width={80}
                        height={80}
                        decoding="async"
                        fetchPriority="high"
                        className="h-16 w-16 rounded-2xl shadow-lg shadow-black/30 ring-1 ring-white/10 sm:h-20 sm:w-20"
                      />
                    </div>
                    <div className="min-w-0 space-y-5 text-center sm:text-left">
                      <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Hermes
                      </h1>
                      <p className="text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
                        Log in to add, change, and delete Lichess{" "}
                        <strong>email templates</strong>
                      </p>
                    </div>
                  </div>
                </header>

                {errorMessage ? (
                  <div className="mt-8" role="alert" aria-live="polite">
                    <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm leading-relaxed text-red-100">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                <div
                  className={
                    errorMessage
                      ? "mt-8 border-t border-zinc-800/60 pt-8"
                      : "mt-10 border-t border-zinc-800/60 pt-8"
                  }
                >
                  <div className="flex flex-wrap gap-3 w-full justify-center">
                    <Link
                      to="/auth/login?redirect=/admin"
                      className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 sm:w-auto"
                    >
                      Log in with Authentik
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
