This folder preserves the original SQLite migration history from before the project switched to PostgreSQL/Supabase.

These migrations are intentionally not part of the active `prisma/migrations` chain because they are SQLite-specific and cannot be safely applied to PostgreSQL.
