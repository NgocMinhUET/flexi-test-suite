import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

// Improved rate limiting handling
const MAX_CONCURRENT = 2; // Reduced from 5 to avoid rate limiting
const MAX_RETRIES = 5; // Increased from 2
const INITIAL_RETRY_DELAY = 1000; // Increased from 500ms
const BATCH_DELAY = 500; // Delay between batches

const languageMap: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
};

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

interface GradeRequest {
  jobId: string;
  userId: string;
  examId: string;
  answers: Record<string, string | string[]>;
  questions: any[];
  startTime: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCode(
  code: string,
  language: string,
  input: string,
  retryCount = 0
): Promise<{ success: boolean; output: string; error?: string }> {
  const langConfig = languageMap[language.toLowerCase()];
  if (!langConfig) {
    return { success: false, output: '', error: `Unsupported language: ${language}` };
  }

  try {
    const response = await fetch(PISTON_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ content: code }],
        stdin: input,
        run_timeout: 10000,
      }),
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited (429), retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
        return executeCode(code, language, input, retryCount + 1);
      }
      console.error(`Max retries reached for rate limiting`);
      return { success: false, output: '', error: `Rate limit exceeded after ${MAX_RETRIES} retries` };
    }

    if (!response.ok) {
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Server error ${response.status}, retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
        return executeCode(code, language, input, retryCount + 1);
      }
      return { success: false, output: '', error: `API error: ${response.status}` };
    }

    const result = await response.json();
    
    if (result.run?.stderr) {
      return { success: false, output: result.run.output || '', error: result.run.stderr };
    }

    return { success: true, output: (result.run?.output || '').trim() };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Network error, retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
      await sleep(delay);
      return executeCode(code, language, input, retryCount + 1);
    }
    return { success: false, output: '', error: String(error) };
  }
}

async function runTestCases(
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<{ passed: number; total: number; results: any[] }> {
  const results: any[] = [];
  let passed = 0;

  // Process in smaller batches with delays between them
  for (let i = 0; i < testCases.length; i += MAX_CONCURRENT) {
    // Add delay between batches (not before first batch)
    if (i > 0) {
      await sleep(BATCH_DELAY);
    }

    const batch = testCases.slice(i, i + MAX_CONCURRENT);
    console.log(`Processing batch ${Math.floor(i / MAX_CONCURRENT) + 1} (${batch.length} tests)`);
    
    const batchResults = await Promise.all(
      batch.map(async (testCase, idx) => {
        const result = await executeCode(code, language, testCase.input);
        const actualOutput = result.output.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const isPassed = result.success && actualOutput === expectedOutput;
        
        return {
          testIndex: i + idx,
          passed: isPassed,
          input: testCase.input,
          expectedOutput,
          actualOutput,
          error: result.error,
          isHidden: testCase.isHidden,
        };
      })
    );
    
    results.push(...batchResults);
    passed += batchResults.filter(r => r.passed).length;
  }

  return { passed, total: testCases.length, results };
}

async function gradeExamInBackground(
  supabase: any,
  request: GradeRequest
): Promise<void> {
  const { jobId, userId, examId, answers, questions, startTime } = request;
  
  console.log(`Starting background grading for job ${jobId}`);

  try {
    // Update job status to processing
    await supabase
      .from('grading_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const codingQuestions = questions.filter((q: any) => q.type === 'coding');
    const nonCodingQuestions = questions.filter((q: any) => q.type !== 'coding');
    const totalQuestions = questions.length;
    let gradedCount = 0;

    const questionResults: any[] = [];
    let totalEarnedPoints = 0;
    let totalPossiblePoints = 0;

    // Grade non-coding questions first (instant)
    for (const question of nonCodingQuestions) {
      const userAnswer = answers[question.id];
      let earnedPoints = 0;
      const questionPoints = question.points || 1;
      totalPossiblePoints += questionPoints;

      if (question.type === 'multiple-choice') {
        const correctAnswer = question.correctAnswer;
        if (Array.isArray(correctAnswer)) {
          const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
          const isCorrect = correctAnswer.length === userAnswerArray.length &&
            correctAnswer.every((a: string) => userAnswerArray.includes(a));
          earnedPoints = isCorrect ? questionPoints : 0;
        } else {
          const normalizedUser = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
          earnedPoints = normalizedUser === correctAnswer ? questionPoints : 0;
        }
      } else if (question.type === 'true-false') {
        earnedPoints = userAnswer === question.correctAnswer ? questionPoints : 0;
      } else if (question.type === 'short-answer') {
        const correctAnswers = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer 
          : [question.correctAnswer];
        const normalizedUser = String(userAnswer || '').trim().toLowerCase();
        const isCorrect = correctAnswers.some((ans: string) => 
          String(ans).trim().toLowerCase() === normalizedUser
        );
        earnedPoints = isCorrect ? questionPoints : 0;
      }

      totalEarnedPoints += earnedPoints;
      questionResults.push({
        questionId: question.id,
        userAnswer,
        earnedPoints,
        maxPoints: questionPoints,
        isCorrect: earnedPoints === questionPoints,
      });

      gradedCount++;
      const progress = Math.round((gradedCount / totalQuestions) * 100);
      await supabase
        .from('grading_jobs')
        .update({ 
          progress, 
          graded_questions: gradedCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    // Grade coding questions SEQUENTIALLY to avoid rate limiting
    if (codingQuestions.length > 0) {
      console.log(`Grading ${codingQuestions.length} coding questions sequentially to avoid rate limiting`);
      
      for (const question of codingQuestions) {
        const userCode = String(answers[question.id] || '');
        const testCases = question.testCases || question.coding?.testCases || [];
        const questionPoints = question.points || 1;
        const scoringMethod = question.scoringMethod || question.coding?.scoringMethod || 'proportional';
        totalPossiblePoints += questionPoints;

        let codingResult: { passed: number; total: number; results: any[] };
        let earnedPoints = 0;

        if (!userCode.trim() || testCases.length === 0) {
          codingResult = { passed: 0, total: testCases.length, results: [] };
        } else {
          const language = question.language || question.coding?.defaultLanguage || 'python';
          console.log(`Grading coding question ${question.id} with ${testCases.length} test cases, scoring: ${scoringMethod}`);
          codingResult = await runTestCases(userCode, language, testCases);
          
          // Calculate score based on scoring method
          if (scoringMethod === 'all-or-nothing') {
            earnedPoints = codingResult.passed === codingResult.total ? questionPoints : 0;
          } else if (scoringMethod === 'weighted') {
            let totalWeight = 0;
            let earnedWeight = 0;
            codingResult.results.forEach((r, idx) => {
              const weight = testCases[idx]?.weight || 1;
              totalWeight += weight;
              if (r.passed) earnedWeight += weight;
            });
            earnedPoints = totalWeight > 0 
              ? Math.round((earnedWeight / totalWeight) * questionPoints * 100) / 100 
              : 0;
          } else {
            // proportional (default)
            earnedPoints = codingResult.total > 0 
              ? Math.round((codingResult.passed / codingResult.total) * questionPoints * 100) / 100 
              : 0;
          }
        }

        totalEarnedPoints += earnedPoints;
        questionResults.push({
          questionId: question.id,
          userAnswer: userCode,
          earnedPoints,
          maxPoints: questionPoints,
          isCorrect: codingResult.passed === codingResult.total,
          codingResult,
        });

        gradedCount++;
        const progress = Math.round((gradedCount / totalQuestions) * 100);
        await supabase
          .from('grading_jobs')
          .update({ 
            progress, 
            graded_questions: gradedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        // Add delay between coding questions to further reduce rate limiting
        if (codingQuestions.indexOf(question) < codingQuestions.length - 1) {
          await sleep(1000);
        }
      }
    }

    // Calculate final results
    const percentage = totalPossiblePoints > 0 
      ? Math.round((totalEarnedPoints / totalPossiblePoints) * 10000) / 100 
      : 0;
    
    const duration = Math.round((Date.now() - startTime) / 1000);

    let grade = 'F';
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';

    const resultData = {
      questionResults,
      earnedPoints: totalEarnedPoints,
      totalPoints: totalPossiblePoints,
      percentage,
      grade,
      duration,
    };

    // Save to exam_results
    const { error: saveError } = await supabase
      .from('exam_results')
      .insert({
        user_id: userId,
        exam_id: examId,
        question_results: questionResults,
        earned_points: totalEarnedPoints,
        total_points: totalPossiblePoints,
        percentage,
        grade,
        duration,
      });

    if (saveError) {
      console.error('Error saving exam result:', saveError);
      throw new Error(`Failed to save result: ${saveError.message}`);
    }

    // Delete exam draft
    await supabase
      .from('exam_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('exam_id', examId);

    // Update job as completed
    await supabase
      .from('grading_jobs')
      .update({ 
        status: 'completed', 
        progress: 100,
        result_data: resultData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Grading job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Grading job ${jobId} failed:`, error);
    
    await supabase
      .from('grading_jobs')
      .update({ 
        status: 'failed', 
        error_message: String(error),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: GradeRequest = await req.json();
    console.log(`Received grading request for job ${request.jobId}`);

    // Use EdgeRuntime.waitUntil for proper background execution
    const backgroundPromise = gradeExamInBackground(supabase, request);
    
    // @ts-ignore - EdgeRuntime is available in Supabase edge functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundPromise);
    } else {
      // Fallback for older runtime
      backgroundPromise.catch(err => {
        console.error('Background grading error:', err);
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Grading started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting grading:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
