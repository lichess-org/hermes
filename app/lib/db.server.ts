import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type EmailTemplate = {
  id: number;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  created_at: string;
  updated_at: string;
};

const dbPath =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "hermes.db");

let db: Database.Database | null = null;

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates (slug);
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const instance = new Database(dbPath);
    instance.pragma("journal_mode = WAL");
    migrate(instance);
    db = instance;
  }
  return db;
}

export function listTemplates(): EmailTemplate[] {
  return getDb()
    .prepare(
      `SELECT * FROM email_templates ORDER BY name COLLATE NOCASE ASC`,
    )
    .all() as EmailTemplate[];
}

export function getTemplateById(id: number): EmailTemplate | undefined {
  return getDb()
    .prepare(`SELECT * FROM email_templates WHERE id = ?`)
    .get(id) as EmailTemplate | undefined;
}

export function getTemplateBySlug(slug: string): EmailTemplate | undefined {
  return getDb()
    .prepare(`SELECT * FROM email_templates WHERE slug = ?`)
    .get(slug) as EmailTemplate | undefined;
}

export function getTemplateBySlugOrId(key: string): EmailTemplate | undefined {
  if (/^\d+$/.test(key)) {
    return getTemplateById(Number(key));
  }
  return getTemplateBySlug(key);
}

export type NewTemplateInput = {
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
};

export function insertTemplate(input: NewTemplateInput): EmailTemplate {
  const database = getDb();
  const result = database
    .prepare(
      `INSERT INTO email_templates (slug, name, subject, body_html, body_text)
       VALUES (@slug, @name, @subject, @body_html, @body_text)`,
    )
    .run(input);
  const created = getTemplateById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to load template after insert");
  }
  return created;
}

export function updateTemplate(
  id: number,
  input: Partial<NewTemplateInput>,
): EmailTemplate | undefined {
  const database = getDb();
  const existing = getTemplateById(id);
  if (!existing) return undefined;

  const next = {
    slug: input.slug ?? existing.slug,
    name: input.name ?? existing.name,
    subject: input.subject ?? existing.subject,
    body_html: input.body_html ?? existing.body_html,
    body_text: input.body_text ?? existing.body_text,
  };

  database
    .prepare(
      `UPDATE email_templates
       SET slug = @slug,
           name = @name,
           subject = @subject,
           body_html = @body_html,
           body_text = @body_text,
           updated_at = datetime('now')
       WHERE id = @id`,
    )
    .run({ ...next, id });

  return getTemplateById(id);
}

export function deleteTemplate(id: number): boolean {
  const result = getDb()
    .prepare(`DELETE FROM email_templates WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}
