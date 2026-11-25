# Local Supabase / Docker Setup

## Symptom
`npx supabase db reset` fails with `failed to inspect service`.

## Cause (verified in this environment)
- `docker` is **not installed / not on PATH** (`docker --version` → command not found).
- No local Postgres (`psql` not found).
- `npx supabase` (3.4.0) is present, but the Supabase local stack runs all
  services (Postgres, Auth, Storage, etc.) as **Docker containers**. Without a
  running Docker daemon the CLI cannot inspect or start them.

Do not repeatedly retry `db reset` while Docker is unavailable.

## Required setup (one-time)
1. Install **Docker Desktop** for Windows (WSL2 backend):
   - https://docs.docker.com/desktop/install/windows-install/
   - Enable the WSL2 engine; keep Docker Desktop running (tray icon green).
2. Verify:
   ```powershell
   docker --version
   docker info
   ```
3. Start the local stack and reset:
   ```powershell
   npx supabase start      # pulls images, starts containers
   npx supabase db reset   # applies migrations 0001..0021 + seed.sql
   ```
4. Stop when done:
   ```powershell
   npx supabase stop
   ```

## Notes
- `supabase/config.toml` is absent; `npx supabase init` can create one if you
  want a committed project config. The linked remote project is
  `uxdjjrkssorwklsxwppo` (production) and is unaffected by local Docker state.
- Local `db reset` uses `supabase/seed.sql`; production uses migration
  `0021_official_curriculum_data.sql` (never `--include-seed`).