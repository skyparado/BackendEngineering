# Macky Merch API

REST API built with TypeScript, Express 5, SQLite, and Vitest.

## Setup

Requires Node.js 24 or newer and npm. From the repository root:

```sh
npm install
npm run db:setup
npm run dev
```

The API listens at http://localhost:3000. Setup creates `data/macky.sqlite` using
`schema.sql`; server startup also initializes it automatically. Data persists across
restarts. No separate database service is needed.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Run commands from the repository root. Optionally set `PORT` and `DATABASE_PATH`
in your shell. To use an env file, copy `.env.example` to `.env`, build, then run
`node --env-file=.env dist/server.js`. npm scripts do not load .env automatically.

## API

All bodies and responses are JSON. Send `Content-Type: application/json`.

| Method | Path | Success |
| --- | --- | --- |
| POST | /api/products | 201, created product |
| GET | /api/products | 200, product array |
| GET | /api/products/:id | 200, product |
| PUT | /api/products/:id | 200, updated product |
| DELETE | /api/products/:id | 200, success message |

Example POST body:

```json
{
  "name": "LSCS Shirt",
  "price": 450,
  "stock": 20,
  "category": "Clothing",
  "description": "Official LSCS cotton shirt",
  "size": "M"
}
```

`name` (1–120 characters), positive finite numeric `price`, nonnegative safe integer
`stock`, and `category` (1–80 characters) are required on creation.
Custom fields are `description` (up to 2000 characters, defaults to an empty string),
`size` (1–30 characters, defaults to "One Size"), and a generated UTC `createdAt`.
Strings are trimmed. IDs are generated positive integers.

PUT accepts any nonempty subset of writable fields and preserves omitted values.
Unknown fields and changes to `id` or `createdAt` are rejected.
Validation failures return 400 with `error` and field-level `details`;
missing products return 404; unexpected failures return a generic JSON 500 and
are logged on the server. Malformed JSON returns 400 and bodies over 100kb return 413.

GET without query parameters returns all products in ID order. Optional
`?page=1&limit=5` pagination preserves the array response. When pagination is used,
page defaults to 1 and limit to 20; page must be 1–1,000,000 and limit 1–100.
Unsupported or repeated query parameters are invalid.

## Architecture

- `src/app.ts`: application factory and shared JSON error handling.
- `src/products/routes.ts`: HTTP routing and response handling.
- `src/products/repository.ts`: parameterized database operations.
- `src/validation.ts`: create, partial update, and pagination schemas.
- `src/database.ts`: SQLite connection and schema initialization.
- `src/server.ts`: server startup and graceful shutdown.
- `tests/`: HTTP integration tests using a fresh SQLite database per test.

Routes handle HTTP concerns, the repository owns SQL, and shared schemas keep validation
consistent across endpoints. This separation lets HTTP tests inject an isolated database
without starting the production server. A separate service layer is unnecessary until
business rules extend beyond these CRUD operations.

SQLite is a real persistent database that keeps local setup simple. SQL constraints
provide a second validation layer. Node's built-in SQLite module avoids native
third-party database installation steps. Synchronous database operations are suitable
for this small inventory assessment; a high-traffic deployment would need a review
of database concurrency. Prices use SQLite REAL as specified; financial accounting
would benefit from integer minor units.

## Implementation hurdle

Create requests need defaults for optional fields, but partial updates must preserve
existing values. Reusing a schema with creation defaults could reset description or
size during a stock-only update. Separate create and update schemas avoid that issue;
the CRUD integration test verifies a stock-only update preserves all other fields.

## Tests

Vitest and Supertest exercise real SQL and HTTP handlers: CRUD, defaults, invalid
data, unchanged rows after rejected updates, missing IDs, pagination, malformed JSON,
unknown routes, sanitized internal errors, field-length and safe-integer boundaries,
oversized bodies, unsupported charsets, and field-level error details. Tests use isolated in-memory SQLite
databases and do not modify the development database.

## Docker

```sh
docker build -t macky-merch-api .
docker run --rm -p 3000:3000 -v macky-data:/app/data macky-merch-api
```

The named volume persists database files. The container runs as the non-root node user.

## References

- [Node.js SQLite documentation](https://nodejs.org/api/sqlite.html)
- [Express error handling](https://expressjs.com/en/guide/error-handling/)


## Submission verification

Run `npm test`, `npm run typecheck`, and `npm run build`, then start the compiled
server with `npm start`. Verify Docker separately using the commands above; a
passing local test suite does not establish that the container builds and runs.
Commit source files and the lockfile, push to GitHub, and confirm reviewer access
before submitting the repository link. Use feature branches and pull requests for
subsequent changes if claiming the Git workflow bonus.

## Continuous integration

GitHub Actions runs the tests, typecheck, and production build on Node.js 24 for
pushes and pull requests. It also builds the Docker image and checks that the
container serves GET /api/products using a named database volume. Check the
repository Actions tab for the result before submitting.
