# Storage architecture: Cloudflare R2 (production) via StorageService

Final decision: **Supabase is Postgres-only.** All application-managed images (product primary +
gallery images, category images, review images, promotion/banner images, testimonials,
gift-service images, branding assets, and any future storefront upload) go through **Cloudflare
R2**, the production storage provider.

The backend never talks to a storage provider directly. Every image-handling service
(`ProductImageService`, `ReviewService`, `CategoryService`, `HomepageService`,
`StoreSettingsService`, `GiftServiceService`, `PromotionEngineService`, ...) depends only on
`com.alahadattars.service.StorageService`. The active provider is picked at startup by one config
value, `app.storage.provider` (env `STORAGE_PROVIDER`):

- **`r2`** — Cloudflare R2 (`R2StorageServiceImpl`). **The production provider.**
- `local` — dev-only disk storage under `UPLOAD_DIR` (`LocalStorageService`). Default when
  `STORAGE_PROVIDER` is unset, since it needs no credentials.
- `supabase` — Supabase Storage (`SupabaseStorageServiceImpl`). Kept available as an
  alternative/fallback implementation, but must not be the configured production provider.

## Cloudflare dashboard setup (manual, one-time)

Nothing above works until this exists in Cloudflare. In the Cloudflare dashboard:

1. **Create the bucket**: R2 > Overview > Create bucket. Name it whatever you'll put in
   `R2_BUCKET` (e.g. `alahadattars-media`). Any location hint is fine.
2. **Enable public access** on that bucket: R2 > (bucket) > Settings > Public access.
   - Either enable the bucket's own `r2.dev` public URL, or connect a custom domain you own
     (Settings > Public access > Custom Domains — this also puts the bucket behind Cloudflare's
     CDN with your own domain, e.g. `media.alahadattars.com`). Recommended for production.
   - Whichever you pick, that base URL is `R2_PUBLIC_URL` (no trailing slash) —
     `R2StorageServiceImpl.publicUrl()` appends the objectKey to it directly, so browsers fetch
     images straight from Cloudflare and Spring Boot is never in that request path.
3. **Create an API token scoped to R2**: R2 > Overview > Manage API Tokens > Create API Token.
   - Permission: **Object Read & Write**, scoped to the one bucket created above (not
     account-wide) — this backend only ever needs read/write on its own bucket.
   - Cloudflare shows the **Access Key ID** and **Secret Access Key** exactly once — copy both
     immediately into `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (a secrets manager in
     production, not committed anywhere).
4. **Account ID**: shown on the R2 Overview page sidebar (also on any domain's Overview page) —
   this is `R2_ACCOUNT_ID`. It's what builds the S3-compatible endpoint
   `https://<account-id>.r2.cloudflarestorage.com` that `R2StorageServiceImpl` talks to.
5. Set all five `R2_*` values plus `STORAGE_PROVIDER=r2` in the deployed environment's env vars
   (or `.env` for a single-instance deploy) — see `.env.example`.

Nothing else needs configuring in Cloudflare — no Workers, no separate CDN setup (the public
bucket domain/custom domain from step 2 already sits behind Cloudflare's CDN).

## Why switching providers is low-risk

Every stored image reference is a **stable, provider-independent objectKey**
(`products/{productId}/{uuid}.jpg`, `reviews/{reviewId}/{uuid}.jpg`,
`categories/{categoryId}/{uuid}.jpg`, `banners/{uuid}.jpg`, ...) — never a permanent
`https://<bucket>.r2.dev/...` or `https://<project>.supabase.co/...` URL baked into the database.
`StorageService.resolveUrl` turns an objectKey into a browser-facing URL at *read time*, using
whichever provider is currently active. So as long as an objectKey resolves on the new provider
too, nothing else in the app needs to change or know a migration happened.

## Switching providers later (e.g. moving existing objects to a new bucket/provider)

1. Implement/point a `StorageService` implementation at the new provider (same shape as
   `R2StorageServiceImpl`/`SupabaseStorageServiceImpl`) — reuse
   `StorageService.validateAndDetectExtension` / `buildObjectKey` rather than duplicating them,
   and gate it with `@ConditionalOnProperty(prefix = "app.storage", name = "provider", ...)`.
2. **Copy every existing object to the new bucket, preserving the objectKey exactly.** Since
   objectKeys never contain a provider name or bucket, the same key that resolves against the old
   provider today resolves against the new one unchanged tomorrow. A one-off script (or `rclone
   sync` between two S3-compatible endpoints — R2 and Supabase Storage both speak S3) walks the
   bucket and copies each object to the new bucket at the identical path. Nothing in the app runs
   during this step — it's a pure storage-to-storage copy, done ahead of the cutover, and safe to
   re-run.
3. **Verify the copy** (object counts match; spot-check a handful of objectKeys resolve to valid
   images on the new side) before touching any config.
4. **Flip the config**: set `STORAGE_PROVIDER` to the new value (plus whatever credentials that
   implementation needs) and redeploy. No code in `ProductService`, `ReviewService`,
   `CategoryService`, `PromotionEngineService`, controllers, or the frontend changes — they only
   ever called `StorageService`, and every already-stored objectKey now resolves through the new
   provider.
5. **New uploads** after the flip go straight to the new provider (the active provider's
   `uploadFile` is the only one ever used for writes). Old rows and new rows are
   indistinguishable — both are just objectKeys — so there's no backfill or "dual-write" period
   required.
6. Once satisfied, decommission the old bucket.

### Rollback

If something's wrong post-cutover, set `STORAGE_PROVIDER` back to the previous value and
redeploy — the old bucket wasn't touched or deleted by the migration, so this is an instant, safe
revert.
