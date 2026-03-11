
-- Add unique constraint for contest_participants to support upsert from registration flow
ALTER TABLE public.contest_participants ADD CONSTRAINT contest_participants_contest_user_unique UNIQUE (contest_id, user_id);
