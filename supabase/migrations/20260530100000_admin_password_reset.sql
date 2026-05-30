-- 20260530100000_admin_password_reset.sql
-- Add updated_at to public.profiles and create a secure function to allow Master users to reset user passwords

-- 1. Add updated_at to profiles if it does not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create the password reset function
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get the role of the caller from public.profiles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Security check: Only Master role is allowed to change passwords
  IF caller_role IS NULL OR caller_role <> 'Master' THEN
    RAISE EXCEPTION 'Accès refusé. Seul le rôle Master peut réinitialiser les mots de passe.';
  END IF;

  -- Verify password is at least 6 characters
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 6 caractères.';
  END IF;

  -- Update the password in auth.users using pgcrypto's crypt and gen_salt
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  -- Update the profiles updated_at field
  UPDATE public.profiles
  SET updated_at = NOW()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execution permissions
REVOKE ALL ON FUNCTION public.admin_reset_user_password(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;
