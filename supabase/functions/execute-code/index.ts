import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
const PISTON_API = "https://emkc.org/api/v2/piston";

const languageMap: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
};

async function executeCode(
  code: string,
  language: string,
  input: string,
  timeLimit: number
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
      headers: {
        "Content-Type": "application/json",
      },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Piston API error:", errorText);
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
  };
  return extensions[language] || "main.txt";
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, "\n").trim();
}

// Simple in-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // Max requests per minute
const RATE_WINDOW = 60000; // 1 minute in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
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
    if (!checkRateLimit(userId)) {
      console.log(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Please wait before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ExecuteRequest = await req.json();
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

    const results: TestResult[] = [];

    for (const testCase of casesToRun) {
      const { output, executionTime, error } = await executeCode(
        code,
        language,
        testCase.input,
        safeTimeLimit
      );

      const normalizedExpected = normalizeOutput(testCase.expectedOutput);
      const normalizedActual = normalizeOutput(output);

      results.push({
        passed: !error && normalizedActual === normalizedExpected,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: error ? `Error: ${error}` : output,
        executionTime,
        error,
        isHidden: testCase.isHidden,
      });
    }

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
