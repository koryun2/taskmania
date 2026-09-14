# ---- build ----
FROM golang:1.27-alpine AS build

WORKDIR /src

# Dependencies are copied first so this layer is reused whenever only the
# source has changed.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO is off so the binary is static and can run on a bare image; the SQLite
# driver is pure Go, so nothing is lost by it.
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server ./cmd/server

# ---- run ----
FROM alpine:3.21

RUN apk add --no-cache ca-certificates \
 && adduser -D -u 10001 app

WORKDIR /app
COPY --from=build /out/server /app/server

# The SQLite file lands here, so the directory must belong to the app user.
RUN mkdir -p /app/data && chown -R app:app /app

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/app/server"]
