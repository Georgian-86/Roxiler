# StoreRate — Store Rating Platform

A full-stack web app where users rate stores registered on the platform (1–5), with a single login and
role-based access for **System Administrators**, **Normal Users** and **Store Owners**.

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express 5, express-validator, JWT, bcrypt |
| Database | PostgreSQL 16 (plain SQL migrations, `citext`, constraints, triggers) |
| Frontend | React 19, Vite, React Router 7, Axios, lucide-react |
| Tests    | Jest + Supertest (API, real Postgres), Vitest (frontend validation) |

## Quick start

```bash
# 1. Database (or point DATABASE_URL at any Postgres 13+)
docker compose up -d db

# 2. API  → http://localhost:4000
cd backend
cp .env.example .env
npm install
npm run seed        # runs migrations + demo data
npm run dev

# 3. Web  → http://localhost:5173
cd ../frontend
npm install
npm run dev
```

### Demo accounts (password `Password@123`)

| Role        | Email               |
|-------------|---------------------|
| Admin       | admin@roxiler.com   |
| Normal user | user@roxiler.com    |
| Store owner | owner@roxiler.com   |

## Features

**System Administrator**
- Dashboard with total users, stores and submitted ratings
- Add users (Admin / Normal user / Store owner) and stores; assign or change a store's owner at any time
- Store list: name, email, address, rating, owner
- User list: name, email, address, role (+ rating for store owners)
- Filters on name, email, address and role; sortable columns; pagination
- User details page, including the store and its rating for store owners

**Normal User**
- Sign up and log in; change password
- Browse all stores, search by name and address, sort by any column
- See each store's overall rating and their own rating; submit or modify a rating (1–5)

**Store Owner**
- Dashboard with the store's average rating, rating breakdown, and a sortable list of customers who rated it
- Change password

Everyone can log out. Routes are protected on both the client and the API.

## Validation rules (enforced on client, API and database)

| Field    | Rule |
|----------|------|
| Name     | 20–60 characters (applied to both user and store names, since both are "Name" fields in forms) |
| Address  | Required, max 400 characters |
| Password | 8–16 characters, at least one uppercase letter and one special character |
| Email    | Standard email format, unique (case-insensitive) |
| Rating   | Integer 1–5, one per user per store |

## Database schema

```
users    (id, name, email CITEXT UNIQUE, password_hash, address, role user_role, created_at, updated_at)
stores   (id, name, email CITEXT UNIQUE, address, owner_id → users UNIQUE NULL, created_at, updated_at)
ratings  (id, user_id → users, store_id → stores, rating 1..5, created_at, updated_at,
          UNIQUE (user_id, store_id))
```

- `CHECK` constraints mirror the validation rules so bad data can't get in through any path.
- `ON DELETE CASCADE` on ratings, `ON DELETE SET NULL` on store owner.
- Index on `ratings(store_id)` for aggregate queries; `updated_at` maintained by triggers.
- Average ratings are computed on read with `AVG()`, so they can never drift out of sync.

## API

All endpoints are under `/api`. Authenticated requests use `Authorization: Bearer <token>`.
List endpoints accept `sortBy`, `order` (`asc`/`desc`), `page`, `limit` plus filter params and return
`{ data, meta: { total, page, limit, totalPages, sortBy, order } }`.

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST  | `/auth/register` | public | Always creates a normal user |
| POST  | `/auth/login` | public | |
| GET   | `/auth/me` | any | |
| PATCH | `/auth/password` | any | `{ currentPassword, newPassword }` |
| GET   | `/admin/dashboard` | admin | Totals |
| GET   | `/admin/users` | admin | Filters: `name`, `email`, `address`, `role` |
| POST  | `/admin/users` | admin | `{ name, email, address, password, role }` |
| GET   | `/admin/users/:id` | admin | Includes `rating` and `store` for owners |
| GET   | `/admin/owners/available` | admin | Owners without a store |
| GET   | `/admin/stores` | admin | Filters: `name`, `email`, `address` |
| POST  | `/admin/stores` | admin | `{ name, email, address, ownerId? }` |
| PATCH | `/admin/stores/:id/owner` | admin | `{ ownerId \| null }` — assign / change / clear owner |
| GET   | `/stores` | user | Filters: `name`, `address`, `search`; includes `myRating` |
| PUT   | `/stores/:id/rating` | user | `{ rating }` — creates (201) or updates (200) |
| GET   | `/owner/dashboard` | owner | Store, average, distribution, raters |

## Project structure

```
backend/
  src/
    config/        env-driven config
    db/            pool, migration runner, SQL migrations, seed
    middleware/    auth (JWT + role guard), validation, error handling
    routes/        auth, admin, stores (user), owner
    services/      SQL queries / business rules
    utils/         ApiError, safe sort/filter/pagination builder
    validators/    shared field rules
  tests/           Supertest integration tests
frontend/
  src/
    api/           axios client with auth interceptor
    context/       auth + toast providers
    hooks/         useForm (validation), useList (server-side filter/sort/paginate)
    components/    DataTable, FilterBar, Pagination, Modal, StarRating, Layout, …
    pages/         auth, admin/, user/, owner/
```

## Scripts

| Location  | Command | Purpose |
|-----------|---------|---------|
| backend   | `npm run dev` / `npm start` | Run API (applies pending migrations on boot) |
| backend   | `npm run migrate` / `npm run seed` | Migrations / demo data |
| backend   | `npm test` | API integration tests (needs `roxiler_test` DB) |
| backend   | `npm run lint` | ESLint |
| frontend  | `npm run dev` / `npm run build` | Dev server / production build |
| frontend  | `npm test` / `npm run lint` | Vitest / oxlint |

## Security notes

- Passwords hashed with bcrypt; login uses a constant-time path for unknown emails and a generic error.
- JWTs are verified and the user is re-loaded on each request, so role changes and deletions apply immediately;
  tokens issued before a password change are rejected.
- Sort columns are whitelisted and filters are parameterised (LIKE wildcards escaped) — no SQL injection.
- Helmet, CORS allow-list, JSON body size limit and rate limiting on login/register (set `TRUST_PROXY` behind a proxy).
