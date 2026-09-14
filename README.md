# TaskMania

A task board with a Go API and a React front end. Tasks move between **To do**,
**In progress**, and **Done**, carry an importance level, and can be archived
instead of deleted.

![The TaskMania board](docs/board.png)

## Running it

You need Go 1.27+ and Node 24+. Nothing else: the API uses a SQLite file by
default, so there is no database to install.

```bash
# terminal one
cd api && go run ./cmd/server      # http://localhost:8080

# terminal two
cd web && npm install && npm run dev   # http://localhost:5173
```

Open http://localhost:5173. The dev server proxies `/api` to the Go process, so
the browser only ever talks to one origin and CORS stays out of the way.

There is a `Makefile` for the same thing (`make api`, `make web`, `make test`,
`make check`), and `docker compose up --build` runs the whole stack against
PostgreSQL on http://localhost:3000.

## Tests

```bash
make test        # both suites
cd api && go test ./...
cd web && npm test
```

The Go tests run against a real in-memory SQLite database rather than a mocked
store, so the SQL and the version-guarded update are actually exercised. The web
tests mock the API module and drive the real components, which covers the state
transitions and keyboard behaviour without a server.

## How concurrent edits are handled

Two people open the same task. Both see version 3. Both save. Without
protection the second write silently overwrites the first, and the first
person's change is gone with nothing to indicate it ever happened.

Every task carries a `version`. A client must send the version it read, and the
update is written with that version in the `WHERE` clause:

```sql
UPDATE tasks
SET title = ?, ..., version = version + 1, updated_at = ?
WHERE id = ? AND version = ?
RETURNING ...
```

The check belongs in the statement rather than in a read-then-compare, because
between a read and a write another request can commit. Only the database can
decide who won.

If no row matches, the store re-reads the task once to tell the two possible
causes apart: the task was deleted (**404**) or somebody else got there first
(**409**). On a 409 the UI explains what happened and reloads, so the user is
looking at real data before trying again.

`PUT /tasks/{id}` without a `version` is rejected with a 422. A write that does
not say what it is based on cannot be checked.

## API

| Method   | Path          | Notes                                                |
| -------- | ------------- | ---------------------------------------------------- |
| `GET`    | `/health`     | Process is up                                         |
| `GET`    | `/ready`      | Database answers too                                  |
| `GET`    | `/tasks`      | `archived`, `open`, `status`, `importance`, `page`, `limit` |
| `POST`   | `/tasks`      | `title` required; status and importance default        |
| `GET`    | `/tasks/{id}` |                                                       |
| `PUT`    | `/tasks/{id}` | Partial update; `version` required                     |
| `DELETE` | `/tasks/{id}` | Permanent, unlike archiving                            |

Errors come back in one shape, with `fields` filled in when validation failed so
the form can show each message next to the input that caused it:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some fields need attention.",
    "fields": { "title": "Title is required." }
  }
}
```

## Layout

```
api/
  cmd/server/         entrypoint, graceful shutdown
  internal/task/      domain: types, validation, paging rules
  internal/store/     SQL, schema, version-guarded update
  internal/httpapi/   handlers, error mapping, middleware
  internal/config/    environment settings
web/src/
  app/                App, the one place views are composed
  components/         one folder each: component, styles, index
  hooks/              useTasks, useMenu, useDialogFocus, useBusyIds
  lib/                api client, types, formatting
  constants/          columns, labels, view config
  styles/             theme tokens and shared primitives
```

## Decisions worth explaining

**SQLite by default, PostgreSQL when configured.** `go run` should work on a
fresh clone with no setup. `DATABASE_URL` switches to Postgres, and the schema
differs only where the engines do: `TIMESTAMPTZ` and a real `BOOLEAN` instead of
SQLite's stand-ins.

**Writes are not optimistic.** The board waits for the server instead of
updating immediately. With version conflicts in play, a rejected write would
have to be rolled back, and a board that flickers backwards is worse than one
that pauses briefly.

**Busy state is per task, not global.** A single `isSaving` flag would disable
the whole board while one card saved, so `useTasks` tracks a set of ids and each
card checks only its own.

**Load errors and write errors are shown differently.** A failed load replaces
the list, because there is nothing to show and a retry is the only useful
action. A failed write shows a banner and leaves the board alone, because what
is on screen is still correct.

**One action per card.** A task advances a step at a time — Start, then
Complete, then Reopen. Offering every transition put three buttons on every card
and made the common path harder to find. Anything else is done in the details
dialog.

**Ordering is total.** The board sorts by importance, then newest, then id. The
trailing id matters for pagination: without it, rows sharing a timestamp can
appear on two pages or on none.

## Accessibility

The board is fully keyboard operable. Dialogs trap focus, close on Escape, and
return focus to whatever opened them. The importance selector is a real radio
group with arrow-key navigation. The card is opened by a stretched button rather
than a click handler on the container, so the whole surface is clickable while
the card stays reachable by keyboard and the buttons on it keep working. Errors
announce assertively, confirmations politely.

## Known gaps

- Pagination exists in the API and the client requests a large page, but there
  is no pager in the UI yet; the board shows the first 50 tasks.
- No authentication. Every visitor sees the same board.
- No drag and drop between columns.
