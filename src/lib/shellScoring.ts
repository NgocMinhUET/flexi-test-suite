import type { ShellTestKind } from '@/types/exam';

export interface ShellTestResult {
  id: string;
  kind: ShellTestKind;
  description?: string;
  passed: boolean;
  weight: number;
  isHidden: boolean;
}

export interface ShellRunResponse {
  success: boolean;
  error?: string;
  tests?: ShellTestResult[];
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
}

/** Terminal history -> script that is replayed for grading. */
export function historyToScript(history: string[]): string {
  return history.filter((c) => c.trim()).join('\n');
}

/** Proportional (by weight) or all-or-nothing scoring. Mirrors the server. */
export function scoreShell(
  results: Pick<ShellTestResult, 'passed' | 'weight'>[],
  points: number,
  method: 'proportional' | 'all-or-nothing' = 'proportional',
) {
  const total = results.reduce((s, r) => s + (r.weight > 0 ? r.weight : 1), 0);
  const passed = results.filter((r) => r.passed).reduce((s, r) => s + (r.weight > 0 ? r.weight : 1), 0);
  const allPassed = results.length > 0 && results.every((r) => r.passed);
  const earnedPoints =
    method === 'all-or-nothing'
      ? allPassed ? points : 0
      : total > 0 ? Math.round((passed / total) * points * 100) / 100 : 0;
  return { earnedPoints, isCorrect: allPassed, isPartial: !allPassed && earnedPoints > 0 };
}

export const shellTestKindLabels: Record<ShellTestKind, string> = {
  stdout: 'Kết quả in ra',
  file_exists: 'File tồn tại',
  dir_exists: 'Thư mục tồn tại',
  file_content: 'Nội dung file',
  permission: 'Quyền truy cập',
  custom: 'Lệnh kiểm tra tùy chỉnh',
};

export function describeShellTest(t: { kind: ShellTestKind; target?: string; expected?: string; description?: string }) {
  if (t.description?.trim()) return t.description;
  switch (t.kind) {
    case 'stdout': return 'Kết quả in ra đúng yêu cầu';
    case 'file_exists': return `Có file ${t.target}`;
    case 'dir_exists': return `Có thư mục ${t.target}`;
    case 'file_content': return `Nội dung ${t.target} đúng`;
    case 'permission': return `${t.target} có quyền ${t.expected}`;
    default: return 'Kiểm tra tùy chỉnh';
  }
}
