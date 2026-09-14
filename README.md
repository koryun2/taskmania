# TaskMania

A task board. Move work through **To do**, **In progress**, and **Done**. Set importance, archive what you no longer need.

Go 1.27+ and Node 24+. SQLite is used by default, so there is no database to install.

```bash
cd api && go run ./cmd/server                 # :8080
cd taskmania && npm install && npm run dev    # :5173
```

Open http://localhost:5173.

`make test` runs the tests. `docker compose up --build` runs the stack on http://localhost:3000.

Updates send a `version`. If someone else saved first, the API returns **409** and the UI reloads.
