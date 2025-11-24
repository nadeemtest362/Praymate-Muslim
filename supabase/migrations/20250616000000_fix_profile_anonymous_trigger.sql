-- Fix profile creation trigger to use auth.users.is_anonymous directly
-- instead of checking raw_app_meta_data->>'provider' = 'anonymous'

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_anonymous)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.is_anonymous  -- Use the is_anonymous field directly
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing mismatched profiles
UPDATE public.profiles p
SET is_anonymous = u.is_anonymous
FROM auth.users u
WHERE p.id = u.id
  AND p.is_anonymous != u.is_anonymous; 