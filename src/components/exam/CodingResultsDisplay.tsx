import { CheckCircle2, XCircle, Eye, EyeOff, Zap, Award, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CodingGradingResult } from '@/types/exam';

interface CodingResultsDisplayProps {
  codingResults: CodingGradingResult;
  userAnswer: string;
}

const scoringMethodLabels: Record<string, string> = {
  'proportional': 'Tỷ lệ',
  'all-or-nothing': 'Toàn phần',
  'weighted': 'Trọng số',
};

const CodingResultsDisplay = ({ codingResults, userAnswer }: CodingResultsDisplayProps) => {
  const { 
    passedTests, 
    totalTests, 
    visibleTests, 
    hiddenTests, 
    earnedPoints, 
    maxPoints, 
    scoringMethod, 
    testResults 
  } = codingResults;
  
  const passPercentage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  const isAllPassed = passedTests === totalTests;
  const isPartial = passedTests > 0 && passedTests < totalTests;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Overall Score */}
        <div className={cn(
          "p-4 rounded-xl border text-center",
          isAllPassed 
            ? "bg-success/10 border-success/30" 
            : isPartial 
              ? "bg-warning/10 border-warning/30"
              : "bg-destructive/10 border-destructive/30"
        )}>
          <Award className={cn(
            "w-6 h-6 mx-auto mb-2",
            isAllPassed ? "text-success" : isPartial ? "text-warning" : "text-destructive"
          )} />
          <div className="text-2xl font-bold text-foreground">
            {earnedPoints}/{maxPoints}
          </div>
          <div className="text-xs text-muted-foreground">điểm</div>
        </div>

        {/* Pass Rate */}
        <div className="p-4 rounded-xl border bg-muted/30 text-center">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-foreground">
            {passPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">tỷ lệ pass</div>
        </div>

        {/* Visible Tests */}
        <div className="p-4 rounded-xl border bg-muted/30 text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-foreground">
            {visibleTests.passed}/{visibleTests.total}
          </div>
          <div className="text-xs text-muted-foreground">test hiện</div>
        </div>

        {/* Hidden Tests */}
        <div className="p-4 rounded-xl border bg-muted/30 text-center">
          <EyeOff className="w-6 h-6 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold text-foreground">
            {hiddenTests.passed}/{hiddenTests.total}
          </div>
          <div className="text-xs text-muted-foreground">test ẩn</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">
            Kết quả: {passedTests}/{totalTests} test passed
          </span>
          <Badge variant="secondary" className="gap-1">
            <Zap className="w-3 h-3" />
            {scoringMethodLabels[scoringMethod] || scoringMethod}
          </Badge>
        </div>
        <Progress 
          value={passPercentage} 
          className={cn(
            "h-3",
            isAllPassed ? "[&>div]:bg-success" : isPartial ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
          )} 
        />
      </div>

      {/* User Code */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Code của bạn</h4>
        <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto text-sm font-mono max-h-64 overflow-y-auto">
          {userAnswer || '(Không có code)'}
        </pre>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          {/* Visible Tests Section */}
          {visibleTests.total > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Test hiện ({visibleTests.passed}/{visibleTests.total} passed)
              </h4>
              <div className="space-y-2">
                {testResults
                  .filter(tr => !tr.isHidden)
                  .map((tr, idx) => (
                    <div
                      key={tr.testCaseId}
                      className={cn(
                        "p-4 rounded-lg border",
                        tr.passed ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {tr.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="font-medium">Test {idx + 1}</span>
                          {tr.weight && tr.weight > 1 && (
                            <Badge variant="outline" className="text-xs">
                              x{tr.weight}
                            </Badge>
                          )}
                        </div>
                        {tr.executionTime !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {tr.executionTime}ms
                          </span>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Input</div>
                          <pre className="p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                            {tr.input || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Expected</div>
                          <pre className="p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                            {tr.expectedOutput || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Output</div>
                          <pre className={cn(
                            "p-2 rounded text-xs font-mono overflow-x-auto",
                            tr.passed ? "bg-success/10" : "bg-destructive/10"
                          )}>
                            {tr.error || tr.actualOutput || '(empty)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Hidden Tests Section - Only show passed/failed, no details */}
          {hiddenTests.total > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Test ẩn ({hiddenTests.passed}/{hiddenTests.total} passed)
              </h4>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {testResults
                  .filter(tr => tr.isHidden)
                  .map((tr, idx) => (
                    <div
                      key={tr.testCaseId}
                      className={cn(
                        "p-3 rounded-lg border text-center",
                        tr.passed ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {tr.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="text-xs font-medium">#{idx + 1}</span>
                        {tr.weight && tr.weight > 1 && (
                          <span className="text-xs text-muted-foreground">x{tr.weight}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Chi tiết input/output của test ẩn không được hiển thị để bảo mật đề thi.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodingResultsDisplay;
