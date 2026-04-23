import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/admin.templates.$templateId";
import {
  deleteTemplate,
  getTemplateById,
  insertTemplate,
  updateTemplate,
} from "~/lib/db.server";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function parseTemplateId(raw: string | undefined): "new" | number | null {
  if (raw === "new") return "new";
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function loader({ params }: Route.LoaderArgs) {
  const mode = parseTemplateId(params.templateId);
  if (mode === null) {
    throw new Response("Not found", { status: 404 });
  }
  if (mode === "new") {
    return { mode: "new" as const, template: null };
  }
  const template = getTemplateById(mode);
  if (!template) {
    throw new Response("Not found", { status: 404 });
  }
  return { mode: "edit" as const, template };
}

export async function action({ request, params }: Route.ActionArgs) {
  const mode = parseTemplateId(params.templateId);
  if (mode === null) {
    throw new Response("Not found", { status: 404 });
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete") {
    if (mode === "new") {
      return { formError: "Cannot delete a template that is not saved." };
    }
    deleteTemplate(mode);
    throw redirect("/admin");
  }

  const slug = String(form.get("slug") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  const body_html = String(form.get("body_html") ?? "");
  const body_text = String(form.get("body_text") ?? "");

  if (!slug || !name) {
    return { formError: "Slug and name are required." };
  }
  if (!SLUG_RE.test(slug)) {
    return {
      formError:
        "Slug must use letters, numbers, and single hyphens between words (e.g. welcome-email).",
    };
  }

  try {
    if (mode === "new") {
      const created = insertTemplate({
        slug,
        name,
        subject,
        body_html,
        body_text,
      });
      throw redirect(`/admin/templates/${created.id}`);
    }

    const updated = updateTemplate(mode, {
      slug,
      name,
      subject,
      body_html,
      body_text,
    });
    if (!updated) {
      return { formError: "Template not found." };
    }
    return { ok: true as const };
  } catch (e: unknown) {
    if (e instanceof Response) throw e;
    const err = e as { code?: string };
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { formError: "Another template already uses this slug." };
    }
    throw e;
  }
}

export default function AdminTemplateEditor({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { mode, template } = loaderData;
  const formError = actionData && "formError" in actionData ? actionData.formError : undefined;

  const defaults =
    mode === "edit" && template
      ? template
      : {
          slug: "",
          name: "",
          subject: "",
          body_html: "",
          body_text: "",
        };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4 text-sm">
        <Link to="/admin" className="text-zinc-500 hover:text-white">
          ← All templates
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-white">
        {mode === "new" ? "New template" : "Edit template"}
      </h1>

      {formError ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {formError}
        </p>
      ) : null}

      {actionData && "ok" in actionData && actionData.ok ? (
        <p className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          Saved.
        </p>
      ) : null}

      <Form method="post" className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Slug
            </span>
            <input
              name="slug"
              required
              defaultValue={defaults.slug}
              placeholder="welcome-email"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Display name
            </span>
            <input
              name="name"
              required
              defaultValue={defaults.name}
              placeholder="Welcome email"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Subject
          </span>
          <input
            name="subject"
            defaultValue={defaults.subject}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            HTML body
          </span>
          <textarea
            name="body_html"
            rows={12}
            defaultValue={defaults.body_html}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Plain text body
          </span>
          <textarea
            name="body_text"
            rows={8}
            defaultValue={defaults.body_text}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            name="intent"
            value="save"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Save
          </button>
          {mode === "edit" ? (
            <button
              type="submit"
              name="intent"
              value="delete"
              className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50"
              formNoValidate
              onClick={(e) => {
                if (!confirm("Delete this template? This cannot be undone.")) {
                  e.preventDefault();
                }
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      </Form>
    </div>
  );
}
