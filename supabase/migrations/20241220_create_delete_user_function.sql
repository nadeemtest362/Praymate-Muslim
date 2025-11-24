-- Create a function to safely delete a user and all associated data
-- This function handles the deletion in the correct order to respect foreign key constraints

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_prayers INTEGER := 0;
    deleted_intentions INTEGER := 0;
    deleted_people INTEGER := 0;
    deleted_stats INTEGER := 0;
    deleted_onboarding INTEGER := 0;
    deleted_profile INTEGER := 0;
    deleted_auth_user BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Validate input
    IF user_id_to_delete IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User ID cannot be null'
        );
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_delete) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Delete user data in the correct order to respect foreign key constraints
    
    -- 1. Delete prayers (no dependencies)
    DELETE FROM prayers WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_prayers = ROW_COUNT;
    
    -- 2. Delete prayer intentions (depends on prayers)
    DELETE FROM prayer_intentions WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_intentions = ROW_COUNT;
    
    -- 3. Delete prayer focus people (depends on intentions)
    DELETE FROM prayer_focus_people WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_people = ROW_COUNT;
    
    -- 4. Delete user stats
    DELETE FROM user_stats WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_stats = ROW_COUNT;
    
    -- 5. Delete onboarding state
    DELETE FROM onboarding_state WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_onboarding = ROW_COUNT;
    
    -- 6. Delete profile (this will also trigger auth user deletion via RLS)
    DELETE FROM profiles WHERE id = user_id_to_delete;
    GET DIAGNOSTICS deleted_profile = ROW_COUNT;
    
    -- 7. Delete the auth user (this should be handled by the profile deletion trigger)
    -- But let's also explicitly delete it to be sure
    BEGIN
        PERFORM auth.users_delete(user_id_to_delete);
        deleted_auth_user := TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            -- If auth user deletion fails, that's okay - the profile deletion should have triggered it
            deleted_auth_user := FALSE;
    END;
    
    -- Build result
    result := json_build_object(
        'success', true,
        'message', 'Account deleted successfully',
        'deleted_data', json_build_object(
            'prayers', deleted_prayers,
            'intentions', deleted_intentions,
            'people', deleted_people,
            'stats', deleted_stats,
            'onboarding', deleted_onboarding,
            'profile', deleted_profile,
            'auth_user', deleted_auth_user
        )
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return failure
        RAISE LOG 'Error deleting user account %: %', user_id_to_delete, SQLERRM;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to delete account: ' || SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_account(UUID) IS 'Safely deletes a user account and all associated data in the correct order';
