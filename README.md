# TaskMania

A task board. Move work through **To do**, **In progress**, and **Done**. Set importance, archive what you no longer need.

## Setup

Go 1.27+ and Node 24+. Copy `.env.example` to `.env` only if you need to change defaults.

## Backend

```bash
cd api && go run ./cmd/server
```

Listens on http://localhost:8080. `GET /health` should return `{"status":"ok"}`.

## Frontend

```bash
cd taskmania && npm install && npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Go process, so the browser stays on one origin.

## Database

SQLite is the default. The API creates `api/data/taskmania.db` on first run. Nothing else to install.

PostgreSQL is used when `DATABASE_URL` is a `postgres://` URL. Docker Compose does that for you:

```bash
docker compose up --build
```

The full stack is then on http://localhost:3000 (nginx serves the UI and proxies `/api`).

`make test` runs the Go and frontend tests.

## Design decisions

- Packages: `httpapi` (HTTP), `task` (validation and domain), `store` (SQL). The domain has no SQL or HTTP so the rules can be tested alone.
- Extra fields beyond the spec: `version` (concurrency), `importance`, `archived`, `updated_at`.
- The board is three columns (status filter in the UI). The API also accepts `status`, `importance`, `archived`, `page`, and `limit`.
- Writes go to the server first. Optimistic UI would have to roll back on a 409, which looks worse than waiting.
- JSON errors are `{ "error": { "code", "message", "fields?" } }` so the UI can put validation next to the field.

## Concurrent updates

Yes, two users can hit **Save** at the same time. Both requests reach the API. They do not both land.

Each task has an integer `version`. The UI sends the version it last loaded. The write is a single statement:

```sql
UPDATE tasks SET ..., version = version + 1
WHERE id = ? AND version = ?
```

The database runs those updates one after another on the same row. The first `WHERE` still matches, so it writes and bumps the version (1 → 2). The second `WHERE` now fails, so it changes nothing.

The API does **not** check the version in Go and then update. That gap would let both requests pass the check and overwrite each other. Only the `UPDATE … WHERE version = ?` can decide who won.

If that statement matches no row, the API reads once more: gone is **404**, still there is **409**. The UI shows the conflict and reloads. A body with no `version` is **422**.
