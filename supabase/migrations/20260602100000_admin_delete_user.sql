-- Migration: admin_delete_user
-- Adds a SECURITY DEFINER RPC callable by the Master role to delete an auth user.
-- Deleting from auth.users will cascade to the profiles table.

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role text;
BEGIN
    -- Verify caller is the Master role
    SELECT role INTO caller_role
    FROM profiles
    WHERE id = auth.uid();

    IF caller_role IS DISTINCT FROM 'Master' THEN
        RAISE EXCEPTION 'Permission refusée : seul le rôle Master peut supprimer des comptes.';
    END IF;

    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte.';
    END IF;

    -- Delete the user from auth.users (cascades to profiles)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
