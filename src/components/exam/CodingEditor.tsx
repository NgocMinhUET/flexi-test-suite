import { useState, useEffect, useMemo } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Eye, EyeOff, Code2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CodingQuestion, ProgrammingLanguage, TestCase, TestResult } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface CodingEditorProps {
  codingQuestion: CodingQuestion;
  currentCode: string;
  currentLanguage: ProgrammingLanguage;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: ProgrammingLanguage) => void;
}

const languageConfig: Record<ProgrammingLanguage, { name: string; extension: string; icon: string }> = {
  python: { name: 'Python', extension: '.py', icon: '🐍' },
  javascript: { name: 'JavaScript', extension: '.js', icon: '🟨' },
  java: { name: 'Java', extension: '.java', icon: '☕' },
  cpp: { name: 'C++', extension: '.cpp', icon: '⚡' },
  c: { name: 'C', extension: '.c', icon: '🔷' },
  go: { name: 'Go', extension: '.go', icon: '🐹' },
  rust: { name: 'Rust', extension: '.rs', icon: '🦀' },
};

// Execute code using Lovable Cloud edge function with retry logic
const executeCode = async (
  code: string,
  language: ProgrammingLanguage,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number,
  retryCount = 0
): Promise<{ results: TestResult[]; error?: string; retryAfter?: number }> => {
  const MAX_RETRIES = 2;
  
  const { data, error } = await supabase.functions.invoke('execute-code', {
    body: {
      code,
      language,
      testCases: testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
      timeLimit,
      memoryLimit,
      includeHidden: false, // Only run visible tests during exam
    },
  });

  if (error) {
    // Check if it's a rate limit error
    if (error.message?.includes('429') || error.message?.includes('rate')) {
      return { 
        results: [], 
        error: 'Hệ thống đang bận. Vui lòng thử lại sau 30 giây.',
        retryAfter: 30
      };
    }
    return { results: [], error: error.message };
  }

  if (!data.success) {
    // Handle rate limit response from edge function
    if (data.retryAfter) {
      return { 
        results: [], 
        error: data.error,
        retryAfter: data.retryAfter
      };
    }
    
    // Retry on certain errors
    if (data.error?.includes('bận') && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return executeCode(code, language, testCases, timeLimit, memoryLimit, retryCount + 1);
    }
    
    return { results: [], error: data.error };
  }

  // Map API results to our TestResult type (only visible tests shown during exam)
  const results: TestResult[] = testCases
    .filter((tc) => !tc.isHidden)
    .map((tc, index) => {
      const apiResult = data.results[index];
      return {
        testCaseId: tc.id,
        passed: apiResult?.passed ?? false,
        actualOutput: apiResult?.actualOutput ?? '',
        executionTime: apiResult?.executionTime ?? 0,
        isHidden: false,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      };
    });

  return { results };
};

export const CodingEditor = ({
  codingQuestion,
  currentCode,
  currentLanguage,
  onCodeChange,
  onLanguageChange,
}: CodingEditorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showTestCases, setShowTestCases] = useState(true);
  const { toast } = useToast();

  // Reset test results when question changes
  useEffect(() => {
    setTestResults([]);
  }, [codingQuestion]);

  const visibleTestCases = codingQuestion.testCases.filter((tc) => !tc.isHidden);
  const hiddenTestCount = codingQuestion.testCases.filter((tc) => tc.isHidden).length;
  const passedTests = testResults.filter((r) => r.passed).length;

  // Get language extension for CodeMirror
  const languageExtension = useMemo(() => {
    switch (currentLanguage) {
      case 'python':
        return python();
      case 'javascript':
        return javascript();
      case 'java':
        return java();
      case 'cpp':
      case 'c':
        return cpp();
      case 'rust':
        return rust();
      case 'go':
        return go();
      default:
        return python();
    }
  }, [currentLanguage]);

  // Initialize with starter code when language changes
  useEffect(() => {
    if (!currentCode && codingQuestion.starterCode[currentLanguage]) {
      onCodeChange(codingQuestion.starterCode[currentLanguage]);
    }
  }, [currentLanguage, codingQuestion.starterCode, currentCode, onCodeChange]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      const { results, error, retryAfter } = await executeCode(
        currentCode,
        currentLanguage,
        codingQuestion.testCases,
        codingQuestion.timeLimit || 5,
        codingQuestion.memoryLimit || 256
      );

      if (error) {
        toast({
          title: retryAfter ? 'Hệ thống đang bận' : 'Lỗi thực thi',
          description: retryAfter 
            ? `Vui lòng thử lại sau ${retryAfter} giây.`
            : error,
          variant: 'destructive',
        });
      } else {
        setTestResults(results);
        const passed = results.filter((r) => r.passed).length;
        toast({
          title: 'Kết quả chạy thử',
          description: `${passed}/${results.length} test cases passed`,
          variant: passed === results.length ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể kết nối đến server. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (lang: ProgrammingLanguage) => {
    onLanguageChange(lang);
    // Reset to starter code for the new language
    onCodeChange(codingQuestion.starterCode[lang] || '');
    setTestResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {codingQuestion.languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  <span className="flex items-center gap-2">
                    <span>{languageConfig[lang].icon}</span>
                    <span>{languageConfig[lang].name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {codingQuestion.timeLimit && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              {codingQuestion.timeLimit}s limit
            </Badge>
          )}

          {codingQuestion.memoryLimit && (
            <Badge variant="secondary">{codingQuestion.memoryLimit}MB</Badge>
          )}
        </div>

        <Button
          onClick={handleRunCode}
          disabled={isRunning || !currentCode.trim()}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang chạy...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Chạy thử
            </>
          )}
        </Button>
      </div>

      {/* Code Editor */}
      <div className="rounded-xl overflow-hidden border border-border">
        <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <Code2 className="w-4 h-4 text-muted-foreground ml-2" />
            <span className="text-sm text-muted-foreground">
              solution{languageConfig[currentLanguage].extension}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {languageConfig[currentLanguage].name}
          </span>
        </div>
        <CodeMirror
          value={currentCode}
          onChange={(value) => onCodeChange(value)}
          extensions={[languageExtension]}
          theme={vscodeDark}
          placeholder={`// Viết code ${languageConfig[currentLanguage].name} của bạn ở đây...`}
          minHeight="300px"
          className="text-sm"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
        />
      </div>

      {/* Test Cases Panel */}
      <Card variant="elevated" className="overflow-hidden">
        <div
          className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50"
          onClick={() => setShowTestCases(!showTestCases)}
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">Test Cases</h3>
            <Badge variant="secondary">
              {visibleTestCases.length} test hiện
            </Badge>
            <Badge variant="ghost" className="gap-1">
              <EyeOff className="w-3 h-3" />
              {hiddenTestCount} test ẩn
            </Badge>
          </div>

          {testResults.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant={passedTests === visibleTestCases.length ? 'success' : 'warning'}>
                {passedTests}/{visibleTestCases.length} passed
              </Badge>
            </div>
          )}
        </div>

        {showTestCases && (
          <div className="p-4 space-y-3">
            {visibleTestCases.map((testCase, index) => {
              const result = testResults.find((r) => r.testCaseId === testCase.id);

              return (
                <div
                  key={testCase.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    result?.passed && "border-success bg-success/5",
                    result && !result.passed && "border-destructive bg-destructive/5",
                    !result && "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        Test Case {index + 1}
                      </span>
                      {testCase.description && (
                        <span className="text-sm text-muted-foreground">
                          - {testCase.description}
                        </span>
                      )}
                    </div>
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Passed
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </Badge>
                        )}
                        {result.executionTime && (
                          <span className="text-xs text-muted-foreground">
                            {result.executionTime}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Input
                      </label>
                      <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                        {testCase.input || '(không có input)'}
                      </pre>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Expected Output
                      </label>
                      <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                        {testCase.expectedOutput}
                      </pre>
                    </div>
                  </div>

                  {result && !result.passed && result.actualOutput && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-destructive block mb-1">
                        Your Output
                      </label>
                      <pre className="bg-destructive/10 p-3 rounded-lg text-sm font-mono text-destructive overflow-x-auto">
                        {result.actualOutput}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hidden tests notice */}
            {hiddenTestCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {hiddenTestCount} test case ẩn
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Các test case ẩn sẽ được chấm điểm khi bạn nộp bài
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
