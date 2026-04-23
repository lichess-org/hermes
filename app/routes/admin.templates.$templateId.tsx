import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/admin.templates.$templateId";
import {
  deleteTemplate,
  getTemplateById,
  updateTemplate,
} from "~/lib/db.server";

function parseTemplateId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function loader({ params }: Route.LoaderArgs) {
  if (params.templateId === "new") {
    throw redirect("/admin");
  }
  const id = parseTemplateId(params.templateId);
  if (id === null) {
    throw new Response("Not found", { status: 404 });
  }
  const template = getTemplateById(id);
  if (!template) {
    throw new Response("Not found", { status: 404 });
  }
  return { template };
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = parseTemplateId(params.templateId);
  if (id === null) {
    throw new Response("Not found", { status: 404 });
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "delete") {
    deleteTemplate(id);
    throw redirect("/admin");
  }

  const name = String(form.get("name") ?? "").trim();
  const body = String(form.get("body") ?? "");
  const appendSignature = form.get("appendSignature") === "on";

  if (!name) {
    return { formError: "Name is required." };
  }

  const updated = updateTemplate(id, { name, body, appendSignature });
  if (!updated) {
    return { formError: "Template not found." };
  }
  return { ok: true as const };
}

export default function AdminTemplateEditor({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { template } = loaderData;
  const formError =
    actionData && "formError" in actionData ? actionData.formError : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4 text-sm">
        <Link to="/admin" className="text-zinc-500 hover:text-white">
          ← All templates
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-white">Edit template</h1>

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
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Template name
          </span>
          <input
            name="name"
            required
            defaultValue={template.name}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Email body
          </span>
          <textarea
            name="body"
            rows={16}
            defaultValue={template.body}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-3">
          <input
            type="checkbox"
            name="appendSignature"
            defaultChecked={template.appendSignature}
            className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600 focus:ring-emerald-600"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-200">
              Append signature
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              When enabled, the consumer (e.g. extension) should add the usual
              signature after this body.
            </span>
          </span>
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
        </div>
      </Form>
    </div>
  );
}
