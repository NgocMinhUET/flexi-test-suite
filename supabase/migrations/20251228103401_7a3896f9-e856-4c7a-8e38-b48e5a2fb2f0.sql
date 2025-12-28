-- Create a security definer function for soft-deleting questions
-- This bypasses RLS safely while still checking ownership/admin permissions

CREATE OR REPLACE FUNCTION public.soft_delete_questions(question_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is admin
  is_admin := has_role(current_user_id, 'admin'::app_role);
  
  IF is_admin THEN
    -- Admin can delete any question
    UPDATE questions
    SET deleted_at = now()
    WHERE id = ANY(question_ids)
    AND deleted_at IS NULL;
  ELSE
    -- Teachers can only delete their own questions
    UPDATE questions
    SET deleted_at = now()
    WHERE id = ANY(question_ids)
    AND created_by = current_user_id
    AND deleted_at IS NULL;
  END IF;
END;
$$;