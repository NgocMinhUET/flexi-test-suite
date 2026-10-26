import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildGradingScript, parseGradingOutput, buildTerminalScript, parseTerminalOutput, type ShellConfig } from "../_shared/shell.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteRequest {
  code: string;
  language: string;
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
  timeLimit: number;
  memoryLimit: number;
  includeHidden?: boolean; // Only true when grading
}

interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
  isHidden: boolean;
}

// Piston API - Free code execution engine
// Self-hosted Piston instance (public emkc API is whitelist-only since 2026-02)
const PISTON_API = (Deno.env.get("PISTON_API_URL") || "https://emkc.org/api/v2/piston").replace(/\/+$/, "").replace(/\/execute$/, "");
const PISTON_KEY = Deno.env.get("PISTON_API_KEY") || "";
const pistonHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(PISTON_KEY ? { Authorization: PISTON_KEY } : {}),
});

const languageMap: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
  bash: { language: "bash", version: "*" },
};

// Improved retry configuration for better rate limit handling
const MAX_RETRIES = 7; // Increased for better reliability
const INITIAL_RETRY_DELAY = 1500; // Increased from 1000ms
const BATCH_DELAY = 500; // Delay between batches (increased from 300ms)

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCodeWithRetry(
  code: string,
  language: string,
  input: string,
  timeLimit: number,
  retryCount = 0
): Promise<{ output: string; executionTime: number; error?: string }> {
  const startTime = Date.now();
  
  const langConfig = languageMap[language];
  if (!langConfig) {
    return {
      output: "",
      executionTime: 0,
      error: `Unsupported language: ${language}`,
    };
  }

  try {
    const response = await fetch(`${PISTON_API}/execute`, {
      method: "POST",
      headers: pistonHeaders(),
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [
          {
            name: getFileName(language),
            content: code,
          },
        ],
        stdin: input,
        run_timeout: timeLimit * 1000, // Convert to milliseconds
      }),
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited (429), retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
        return executeCodeWithRetry(code, language, input, timeLimit, retryCount + 1);
      }
      return {
        output: "",
        executionTime: Date.now() - startTime,
        error: "Hệ thống đang bận. Vui lòng thử lại sau 30 giây.",
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Piston API error:", errorText);
      
      // Retry on server errors
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Server error ${response.status}, retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
        return executeCodeWithRetry(code, language, input, timeLimit, retryCount + 1);
      }
      
      return {
        output: "",
        executionTime: Date.now() - startTime,
        error: `Execution service error: ${response.status}`,
      };
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;

    console.log("Piston result:", JSON.stringify(result));

    // Check for compile errors
    if (result.compile && result.compile.code !== 0) {
      return {
        output: "",
        executionTime,
        error: `Compilation error:\n${result.compile.stderr || result.compile.output}`,
      };
    }

    // Check for runtime errors
    if (result.run.code !== 0 && result.run.stderr) {
      return {
        output: result.run.output || "",
        executionTime,
        error: result.run.stderr,
      };
    }

    // Check for timeout
    if (result.run.signal === "SIGKILL") {
      return {
        output: "",
        executionTime,
        error: `Time Limit Exceeded (>${timeLimit}s)`,
      };
    }

    return {
      output: (result.run.output || "").trim(),
      executionTime,
    };
  } catch (error: unknown) {
    console.error("Execute error:", error);
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Network error, retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
      await sleep(delay);
      return executeCodeWithRetry(code, language, input, timeLimit, retryCount + 1);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      output: "",
      executionTime: Date.now() - startTime,
      error: `Execution failed: ${errorMessage}`,
    };
  }
}

function getFileName(language: string): string {
  const extensions: Record<string, string> = {
    python: "main.py",
    javascript: "main.js",
    java: "Main.java",
    cpp: "main.cpp",
    c: "main.c",
    go: "main.go",
    rust: "main.rs",
    bash: "main.sh",
  };
  return extensions[language] || "main.txt";
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, "\n").trim();
}

// Simple in-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // Allow more requests per user
const RATE_WINDOW = 60000; // 1 minute in milliseconds

function checkRateLimit(userId: string): { allowed: boolean; waitTime?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, waitTime };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// Reduced concurrent executions to avoid rate limiting
const MAX_CONCURRENT = 1; // Run one test at a time for better reliability

async function executeTestsWithConcurrencyLimit(
  code: string,
  language: string,
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[],
  timeLimit: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Process in batches of MAX_CONCURRENT with delays
  for (let i = 0; i < testCases.length; i += MAX_CONCURRENT) {
    // Add delay between batches (not before first batch)
    if (i > 0) {
      await sleep(BATCH_DELAY);
    }

    const batch = testCases.slice(i, i + MAX_CONCURRENT);
    
    const batchPromises = batch.map(async (testCase) => {
      const { output, executionTime, error } = await executeCodeWithRetry(
        code,
        language,
        testCase.input,
        timeLimit
      );

      const normalizedExpected = normalizeOutput(testCase.expectedOutput);
      const normalizedActual = normalizeOutput(output);

      return {
        passed: !error && normalizedActual === normalizedExpected,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error ? `Error: ${error}` : output,
        executionTime,
        error,
        isHidden: testCase.isHidden,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user ID from JWT for rate limiting
    const authHeader = req.headers.get('authorization');
    const userId = authHeader ? authHeader.split('.')[1] || 'anonymous' : 'anonymous';
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi ${rateLimitResult.waitTime} giây trước khi thử lại.`,
          retryAfter: rateLimitResult.waitTime
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.waitTime || 60)
          } 
        }
      );
    }

    const rawBody = await req.json();
    if (rawBody?.mode === "shell" || rawBody?.mode === "terminal") {
      return await handleShell(rawBody, userId);
    }
    const body: ExecuteRequest = rawBody;
    const { code, language, testCases, timeLimit, memoryLimit, includeHidden } = body;

    // Input validation
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "Code is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (code.length > 50000) {
      return new Response(
        JSON.stringify({ success: false, error: "Code exceeds maximum length of 50,000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!language || !languageMap[language]) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!testCases || !Array.isArray(testCases)) {
      return new Response(
        JSON.stringify({ success: false, error: "Test cases must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (testCases.length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Maximum 50 test cases allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce safe limits
    const safeTimeLimit = Math.min(Math.max(1, timeLimit || 5), 30);

    console.log(`Executing ${language} code with ${testCases.length} test cases`);

    // Filter test cases based on whether we're grading or just running
    const casesToRun = includeHidden 
      ? testCases 
      : testCases.filter(tc => !tc.isHidden);

    // Execute with concurrency limit and retry logic
    const results = await executeTestsWithConcurrencyLimit(
      code,
      language,
      casesToRun,
      safeTimeLimit
    );

    const totalPassed = results.filter(r => r.passed).length;
    const totalTests = results.length;

    console.log(`Results: ${totalPassed}/${totalTests} passed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          passed: totalPassed,
          total: totalTests,
          allPassed: totalPassed === totalTests,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


// ===== Shell / Linux questions =====
const lastShellRun = new Map<string, number>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function runBashRaw(script: string, timeoutSec: number): Promise<{ output: string; error?: string }> {
  for (let attempt = 0; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${PISTON_API}/execute`, {
        method: "POST",
        headers: pistonHeaders(),
        body: JSON.stringify({
          language: "bash",
          version: "*",
          files: [{ name: "main.sh", content: script }],
          run_timeout: timeoutSec * 1000,
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        continue;
      }
      if (!res.ok) {
        const t = await res.text();
        return { output: "", error: `Máy chạy mã báo lỗi (${res.status}): ${t.slice(0, 200)}` };
      }
      const r = await res.json();
      return { output: r.run?.stdout ?? r.run?.output ?? "" };
    } catch (e) {
      if (attempt === 4) return { output: "", error: `Không kết nối được máy chạy mã: ${e instanceof Error ? e.message : e}` };
      await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
    }
  }
  return { output: "", error: "Máy chạy mã đang bận. Vui lòng thử lại." };
}

async function handleShell(body: any, userId: string) {
  const config = body.shell as ShellConfig;
  if (!config || !Array.isArray(config.tests)) return json({ success: false, error: "Thiếu cấu hình câu hỏi Shell" }, 400);

  // Per-user pacing for practice runs (grading runs are not throttled)
  if (!body.includeHidden) {
    const minGap = body.mode === "terminal" ? 1500 : 5000;
    const key = `${userId}:${body.mode}`;
    const now = Date.now();
    const last = lastShellRun.get(key) || 0;
    if (now - last < minGap) {
      const wait = Math.ceil((minGap - (now - last)) / 1000);
      return json({ success: false, error: `Vui lòng đợi ${wait} giây rồi chạy lại.`, retryAfter: wait }, 429);
    }
    lastShellRun.set(key, now);
  }

  if (body.mode === "terminal") {
    const history: string[] = Array.isArray(body.history) ? body.history.map(String).slice(-200) : [];
    if (history.length === 0) return json({ success: false, error: "Chưa có lệnh" }, 400);
    if (history.join("\n").length > 50000) return json({ success: false, error: "Lịch sử lệnh quá dài" }, 400);
    const { output, error } = await runBashRaw(buildTerminalScript(config, history), 10);
    if (error) return json({ success: false, error });
    return json({ success: true, ...parseTerminalOutput(output) });
  }

  const script = String(body.script ?? "");
  if (script.length > 50000) return json({ success: false, error: "Bài làm quá dài" }, 400);
  const includeHidden = !!body.includeHidden;
  const tl = Math.min(Math.max(1, config.timeLimit || 5), 20);
  const { output, error } = await runBashRaw(buildGradingScript(config, script, includeHidden), tl + 15);
  if (error) return json({ success: false, error });
  return json({ success: true, ...parseGradingOutput(config, output, includeHidden) });
}
