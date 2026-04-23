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

## Stack

React Router 7, React 19, TypeScript, Tailwind CSS, SQLite (via
`better-sqlite3`).

## TODO

- **Copy & UI**: Tighten landing and admin wording for the real audience; add
  empty states, loading states, and clearer error messages where needed.
- **Authentik**: Create or finalize the OAuth2/OpenID provider application; set
  redirect URI to `{APP_URL}/auth/callback` (must match `APP_URL` exactly);
  confirm scopes (`openid`, `email`, `profile`) and that maintainers who should
  edit are allowed to sign in (groups / access policies if you want more than
  “any Authentik user”).
- **Portainer / Docker**: Build the image (or wire a registry + stack); set env
  vars (`APP_URL`, `SESSION_SECRET`, Authentik, `DATABASE_PATH`); attach a
  **persistent volume** for the SQLite file directory; publish port **3000** (or
  set `PORT` if the stack maps a different host port); health check / restart
  policy as desired.
- **Ops**: Backups or snapshots for the SQLite volume; optional logging /
  metrics; review CORS if the extension or other callers need a stricter policy
  than public `GET` with `*`.
