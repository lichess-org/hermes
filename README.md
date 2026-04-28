# Hermes

Hermes serves **email templates** to the
[lichess-gmail](https://github.com/ornicar/lichess-gmail) browser extension and
ships a small web UI to **view and manage** those templates. The email templates
are publicly readable but requires auth via
[Authentik](https://auth.lichess.app/) to edit.

## What it does

- **lichess-gmail** loads template content from Hermes when using Gmail.
- **Maintainers** sign in with Authentik to add or change templates.

## Development

Install dependencies and start the dev server (Vite + React Router):

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5173` by default.

## Configuration

Copy `.env.example` to `.env` and set at least `APP_URL`, `SESSION_SECRET`, and
the Authentik values (`AUTHENTIK_ISSUER`, `AUTHENTIK_CLIENT_ID`,
`AUTHENTIK_CLIENT_SECRET`). Optional: `DATABASE_PATH` for the SQLite file,
`PORT` in production. See inline comments in `.env.example` for details.

## Production

Build and run:

```bash
npm run build
npm start
```

A `Dockerfile` is for containerized deployment; map storage/volumes for the
database path if you set `DATABASE_PATH` outside the image.

### Database backups

Run this inside the running app container:

```bash
node -e "const db = require('better-sqlite3')('/data/hermes.db'); db.backup(\`/data/hermes-backup-\${new Date().toISOString().slice(0,10)}.db\`).then(() => console.log('done'));"
```

The backup file is written next to the live DB on the same volume (e.g.
`/data/hermes-backup-2026-04-28.db`).

## Stack

React Router 7, React 19, TypeScript, Tailwind CSS, SQLite (via
`better-sqlite3`).
