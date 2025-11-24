# Supabase Migration Guide

## Current Situation
Our migrations have been applied via the Supabase dashboard, so local files may be out of sync.

## How to Sync Local with Remote

1. **Mark existing migrations as applied:**
   ```bash
   npx supabase migration list  # See what needs to be marked
   npx supabase migration repair --status applied <migration_name>
   ```

2. **Pull current database schema:**
   ```bash
   npx supabase db pull
   ```
   This creates a baseline migration of your current database state.

## Going Forward - Best Practices

### Option 1: Continue Using Dashboard (Recommended for now)
- Apply migrations via dashboard as you've been doing
- Save the SQL in `supabase/migrations-backup/` for reference
- This avoids sync issues

### Option 2: Switch to Local Migrations
1. Get fully in sync first (steps above)
2. Create new migrations locally:
   ```bash
   npx supabase migration new <description>
   ```
3. Test migrations safely:
   ```bash
   # ⚠️ WARNING: db reset DESTROYS ALL DATA! Only use on test databases!
   # npx supabase db reset  # DO NOT RUN THIS ON PRODUCTION DATA
   
   # Instead, test migrations by:
   # - Creating a separate test project in Supabase
   # - Or reviewing the SQL carefully before applying
   # - Or testing on a local Docker instance (npx supabase start)
   ```
4. Push to remote:
   ```bash
   npx supabase db push  # This applies pending migrations
   ```

## Safe Testing Approach

### For Local Development
```bash
# Start local Supabase (uses Docker, isolated from production)
npx supabase start

# Apply migrations to local instance
npx supabase db push

# Test your changes locally
# When done, stop local instance
npx supabase stop
```

### For Production Changes
1. Write migration in `migrations-backup/` first
2. Review SQL carefully
3. Test on a staging project if available
4. Apply via dashboard (current approach)
5. OR use `npx supabase db push` after thorough testing

## Common Issues

### "Migration history does not match"
- Run `npx supabase migration list` to see what's out of sync
- Use `npx supabase migration repair --status applied <name>` for each

### RLS Policy Syntax
- Don't use `CREATE POLICY IF NOT EXISTS` (not valid PostgreSQL)
- Instead use:
  ```sql
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  CREATE POLICY "policy_name" ON table_name ...
  ```

### Storage Policies
- Storage policies apply to the `storage.objects` table
- Always check bucket exists first:
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
  ```

## Current Migration Status
- All migrations in `/migrations` folder have been applied via dashboard
- Avatar upload RLS policies have been fixed and are working 