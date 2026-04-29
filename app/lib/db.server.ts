import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type EmailTemplate = {
  id: number;
  name: string;
  category: "admin" | "broadcast";
  body: string;
  notes: string;
  appendSignature: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

type TemplateRow = {
  id: number;
  name: string;
  category: string;
  body: string;
  notes: string;
  append_signature: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
};

function mapRow(row: TemplateRow): EmailTemplate {
  const category = row.category === "broadcast" ? "broadcast" : "admin";
  return {
    id: row.id,
    name: row.name,
    category,
    body: row.body,
    notes: row.notes ?? "",
    appendSignature: row.append_signature === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: (row.updated_by ?? "").trim(),
  };
}

const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hermes.db");
let db: Database.Database | null = null;

function getColumnNames(database: Database.Database, table: string): string[] {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

function backfillSortOrder(database: Database.Database) {
  const rows = database
    .prepare(`SELECT id FROM email_templates ORDER BY id ASC`)
    .all() as { id: number }[];
  const upd = database.prepare(
    `UPDATE email_templates SET sort_order = ? WHERE id = ?`,
  );
  rows.forEach((row, index) => {
    upd.run(index, row.id);
  });
}

function migrate(database: Database.Database) {
  const hasTable = Boolean(
    database
      .prepare(
        `SELECT 1 FROM sqlite_master WHERE type='table' AND name='email_templates'`,
      )
      .get(),
  );

  if (!hasTable) {
    database.exec(`
    CREATE TABLE email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'admin',
      body TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      append_signature INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT NOT NULL DEFAULT ''
    );
  `);
    return;
  }

  let columns = getColumnNames(database, "email_templates");

  if (!columns.includes("body")) {
    if (!columns.includes("slug")) {
      throw new Error("email_templates has unexpected schema; cannot migrate");
    }

    database.exec(`
    CREATE TABLE email_templates__new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      append_signature INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT ''
    );
    INSERT INTO email_templates__new (id, name, body, notes, sort_order, created_at, updated_at, updated_by)
    SELECT
      id,
      name,
      TRIM(
        COALESCE(body_html, '')
        || CASE
          WHEN TRIM(COALESCE(body_text, '')) = '' THEN ''
          ELSE char(10) || body_text
        END
      ),
      '',
      id,
      created_at,
      updated_at,
      ''
    FROM email_templates;
    DROP TABLE email_templates;
    ALTER TABLE email_templates__new RENAME TO email_templates;
  `);
  }

  columns = getColumnNames(database, "email_templates");
  if (!columns.includes("append_signature")) {
    database.exec(
      `ALTER TABLE email_templates ADD COLUMN append_signature INTEGER NOT NULL DEFAULT 1`,
    );
  }

  columns = getColumnNames(database, "email_templates");
  if (!columns.includes("sort_order")) {
    database.exec(
      `ALTER TABLE email_templates ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    );
    backfillSortOrder(database);
  }

  columns = getColumnNames(database, "email_templates");
  if (!columns.includes("notes")) {
    database.exec(
      `ALTER TABLE email_templates ADD COLUMN notes TEXT NOT NULL DEFAULT ''`,
    );
  }

  columns = getColumnNames(database, "email_templates");
  if (!columns.includes("updated_by")) {
    database.exec(
      `ALTER TABLE email_templates ADD COLUMN updated_by TEXT NOT NULL DEFAULT ''`,
    );
  }

  columns = getColumnNames(database, "email_templates");
  if (!columns.includes("category")) {
    database.exec(
      `ALTER TABLE email_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'admin'`,
    );
  }
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

export function listTemplates(
  category?: EmailTemplate["category"],
): EmailTemplate[] {
  const rows =
    category === "admin" || category === "broadcast"
      ? ((getDb()
          .prepare(
            `SELECT id, name, category, body, notes, append_signature, created_at, updated_at, updated_by
             FROM email_templates
             WHERE category = ?
             ORDER BY sort_order ASC, id ASC`,
          )
          .all(category) as TemplateRow[]) ?? [])
      : ((getDb()
          .prepare(
            `SELECT id, name, category, body, notes, append_signature, created_at, updated_at, updated_by
             FROM email_templates
             ORDER BY sort_order ASC, id ASC`,
          )
          .all() as TemplateRow[]) ?? []);
  return rows.map(mapRow);
}

export function getTemplateById(id: number): EmailTemplate | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, name, category, body, notes, append_signature, created_at, updated_at, updated_by
       FROM email_templates WHERE id = ?`,
    )
    .get(id) as TemplateRow | undefined;
  return row ? mapRow(row) : undefined;
}

export type NewTemplateInput = {
  name: string;
  category?: "admin" | "broadcast";
  body: string;
  notes: string;
  appendSignature: boolean;
  updatedBy: string;
};

export function insertTemplate(input: NewTemplateInput): EmailTemplate {
  const database = getDb();
  const maxRow = database
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM email_templates`)
    .get() as { m: number };
  const sortOrder = maxRow.m + 1;

  const result = database
    .prepare(
      `INSERT INTO email_templates (name, category, body, notes, append_signature, sort_order, updated_by)
       VALUES (@name, @category, @body, @notes, @append_signature, @sort_order, @updated_by)`,
    )
    .run({
      name: input.name,
      category: input.category === "broadcast" ? "broadcast" : "admin",
      body: input.body,
      notes: input.notes,
      append_signature: input.appendSignature ? 1 : 0,
      sort_order: sortOrder,
      updated_by: input.updatedBy,
    });
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
    name: input.name ?? existing.name,
    category:
      input.category !== undefined
        ? input.category === "broadcast"
          ? "broadcast"
          : "admin"
        : existing.category,
    body: input.body ?? existing.body,
    notes: input.notes ?? existing.notes,
    updated_by:
      input.updatedBy !== undefined ? input.updatedBy : existing.updatedBy,
    append_signature:
      input.appendSignature !== undefined
        ? input.appendSignature
          ? 1
          : 0
        : existing.appendSignature
          ? 1
          : 0,
  };

  database
    .prepare(
      `UPDATE email_templates
       SET name = @name,
           category = @category,
           body = @body,
           notes = @notes,
           append_signature = @append_signature,
           updated_at = datetime('now'),
           updated_by = @updated_by
       WHERE id = @id`,
    )
    .run({ ...next, id });

  return getTemplateById(id);
}

export function reorderTemplates(
  orderedIds: number[],
  updatedBy: string,
): boolean {
  const database = getDb();
  const rows = database.prepare(`SELECT id FROM email_templates`).all() as {
    id: number;
  }[];
  const existing = new Set(rows.map((r) => r.id));
  if (orderedIds.length !== existing.size) {
    return false;
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return false;
  }
  for (const id of orderedIds) {
    if (!existing.has(id)) {
      return false;
    }
  }

  const stmt = database.prepare(
    `UPDATE email_templates
     SET sort_order = ?,
         updated_at = datetime('now'),
         updated_by = ?
     WHERE id = ?`,
  );
  const tx = database.transaction(() => {
    orderedIds.forEach((id, index) => {
      stmt.run(index, updatedBy, id);
    });
  });
  tx();
  return true;
}

export function deleteTemplate(id: number): boolean {
  const result = getDb()
    .prepare(`DELETE FROM email_templates WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}
