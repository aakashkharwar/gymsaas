-- Migration: Create triggers to sync auth.users -> public.admin_users
-- Adds trigger functions to create an admin_users row when a new auth user is created,
-- keep the email in sync on update, and remove the metadata on delete.

-- NOTE: Running this requires sufficient privileges to create functions and triggers
-- on the auth schema. On Supabase, run via SQL editor or migrations.

-- 1) Create function to handle INSERT on auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new admin_users row for every new auth user.
  -- If a row already exists (unlikely), keep existing values.
  INSERT INTO public.admin_users(id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Create function to handle UPDATE on auth.users (keep email in sync)
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user's email changed, update the admin_users table
  IF (NEW.email IS DISTINCT FROM OLD.email) THEN
    UPDATE public.admin_users
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Create function to handle DELETE on auth.users (cleanup)
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.admin_users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Create triggers on auth.users
DO $$
BEGIN
  -- Only create trigger if the auth.users table exists
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'users' AND n.nspname = 'auth') THEN

    -- Drop existing triggers if they exist to make the migration idempotent
    IF EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'auth_user_created_trigger' AND n.nspname = 'auth'
    ) THEN
      DROP TRIGGER auth_user_created_trigger ON auth.users;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'auth_user_updated_trigger' AND n.nspname = 'auth'
    ) THEN
      DROP TRIGGER auth_user_updated_trigger ON auth.users;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'auth_user_deleted_trigger' AND n.nspname = 'auth'
    ) THEN
      DROP TRIGGER auth_user_deleted_trigger ON auth.users;
    END IF;

    -- Create triggers
    CREATE TRIGGER auth_user_created_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_created();

    CREATE TRIGGER auth_user_updated_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.handle_auth_user_updated();

    CREATE TRIGGER auth_user_deleted_trigger
    AFTER DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_deleted();

  END IF;
END
$$;
