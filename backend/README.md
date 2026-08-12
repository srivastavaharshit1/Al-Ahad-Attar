# Al Ahad Attars - Backend

This is the foundational backend module for the Al Ahad Attars enterprise application.

## Technologies Used
- Java 21
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Data JPA
- Spring Security (Basic Config)
- PostgreSQL (Supabase)
- Hibernate
- Lombok
- Spring Validation
- Spring Boot DevTools
- Swagger / OpenAPI

## Project Structure
The project follows a standard enterprise Spring Boot architecture:
- `config`: Configuration classes (Security, CORS, OpenAPI)
- `controller`: REST APIs
- `dto`: Data Transfer Objects (Future use)
- `entity`: JPA Entities including `BaseEntity`
- `exception`: Global exception handling
- `mapper`: Object mapping logic (Future use)
- `repository`: Data access layer (Future use)
- `response`: Standardized API responses
- `security`: Advanced security implementations (Future use)
- `service`: Business logic interfaces (Future use)
- `service/impl`: Business logic implementations (Future use)
- `constant`: Application constants (Future use)
- `util`: Utility classes (Future use)

## Prerequisites
- **JDK 21** (the app won't compile on an older JDK — check with `java -version`)
- Maven (a system install is fine; no wrapper is committed)
- A [Supabase](https://supabase.com) project (or any reachable PostgreSQL instance) — used for the database only, no local database is used
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket for production image/object storage (not needed for local dev — see Storage below)

## How to Run

1. Copy `.env.example` to `.env` in this directory and fill in real values:
   ```bash
   cp .env.example .env
   ```
   At minimum you need `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` (from your Supabase project's Project Settings > Database page), `JWT_SECRET` (generate with `openssl rand -base64 48`), and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. None of these have defaults — the app fails fast at startup if any are missing, rather than silently running with an insecure fallback.
   `.env` is loaded automatically (via the `spring-dotenv` dependency) — no shell exports needed.
2. Run the application using Maven:
   ```bash
   mvn spring-boot:run
   ```
3. The application will start on port `8080`. `ddl-auto: update` (see `application.yml`) creates/updates tables on startup — no manual migration needed for a fresh Supabase project.

## Storage (Cloudflare R2 in production, local disk in dev)

Product/category/review/banner/testimonial/gift-service/branding images go through the
`StorageService` abstraction (`service/StorageService.java`), not any provider directly.
`STORAGE_PROVIDER` picks the implementation:

- **`r2`** — Cloudflare R2, the production provider. Requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (see `.env.example`). Uploads/deletes go
  through this backend using the credentials server-side; the browser fetches images directly
  from `R2_PUBLIC_URL` (Cloudflare's CDN), never proxied through Spring Boot.
- **`local`** (default) — disk storage under `UPLOAD_DIR`, no credentials needed. Use this for
  local development.
- **`supabase`** — Supabase Storage, kept available as an alternative/fallback implementation but
  not the configured production provider.

The database only ever stores a stable objectKey (e.g. `products/12/<uuid>.jpg`), never a
permanent provider URL, so switching `STORAGE_PROVIDER` never requires touching existing rows —
see `STORAGE_MIGRATION.md` for the full migration procedure and rationale.

**Cloudflare setup required before `STORAGE_PROVIDER=r2` works** — see the "Cloudflare dashboard
setup" section of `STORAGE_MIGRATION.md`.

## Orders, Cancellation & Refunds

All orders are prepaid online via Razorpay — there is no Cash on Delivery. A customer can cancel
their own order only while it's `CONFIRMED`; PACKED is a hard cancellation cutoff for every actor.
Cancelling a paid order never calls Razorpay itself — it only flags `RefundStatus.REFUND_REQUIRED`;
an admin must explicitly process the refund from the admin Refunds page. See
`CANCELLATION_REFUND_POLICY.md` for the full state machine, the duplicate-refund protections, and
where each piece of logic lives.

## Endpoints
- **Health Check**: `GET /api/health`
- **Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
