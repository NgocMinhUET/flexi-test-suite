
-- Allow users to update their own exam results (needed for upsert on retry)
CREATE POLICY "Users can update their own results"
ON public.exam_results
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
