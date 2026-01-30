-- Step 1: Remove duplicate exam_results, keeping only the LATEST submission for each user+exam
-- Using a CTE to identify duplicates and delete all but the most recent

WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, exam_id 
           ORDER BY submitted_at DESC  -- Keep the latest
         ) as rn
  FROM exam_results
)
DELETE FROM exam_results
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Now add the unique constraint to prevent future duplicates
ALTER TABLE public.exam_results 
ADD CONSTRAINT exam_results_user_exam_unique UNIQUE (user_id, exam_id);