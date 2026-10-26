import { useEffect, useRef, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Play, RotateCcw, Loader2, CheckCircle2, XCircle, Terminal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Answer, Question } from '@/types/exam';
import { describeShellTest, historyToScript, type ShellRunResponse } from '@/lib/shellScoring';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  question: Question;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
}

interface TermLine { kind: 'cmd' | 'out' | 'err' | 'info'; text: string; cwd?: string }

async function invokeShell(body: Record<string, unknown>): Promise<ShellRunResponse> {
  const { data, error } = await supabase.functions.invoke('execute-code', { body });
  if (error) {
    let msg = 'Không chạy được. Vui lòng thử lại.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json())?.error || msg;
    } catch { /* ignore */ }
    return { success: false, error: msg };
  }
  return data as ShellRunResponse;
}

function TestResultList({ result }: { result: ShellRunResponse }) {
  if (!result.tests) return null;
  return (
    <div className="space-y-1.5">
      {result.tests.length === 0 && <p className="text-sm text-muted-foreground">Câu này không có bài kiểm tra công khai.</p>}
      {result.tests.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-sm">
          {t.passed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
          <span>{describeShellTest(t)}</span>
        </div>
      ))}
      {result.timedOut && <p className="text-sm text-destructive">Bài làm chạy quá thời gian cho phép.</p>}
    </div>
  );
}

export function ShellQuestionDisplay({ question, currentAnswer, onAnswer }: Props) {
  const shell = question.shell!;
  const isTerminal = shell.mode === 'terminal';

  // ----- Script mode -----
  const initialScript = typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : shell.starterScript || '#!/bin/bash\n';
  const [script, setScript] = useState(initialScript);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<ShellRunResponse | null>(null);

  // ----- Terminal mode -----
  const initialHistory = Array.isArray(currentAnswer?.answer) ? (currentAnswer!.answer as string[]) : [];
  const [history, setHistory] = useState<string[]>(initialHistory);
  const [lines, setLines] = useState<TermLine[]>(() =>
    initialHistory.length
      ? [{ kind: 'info', text: `Đã khôi phục ${initialHistory.length} lệnh đã gõ trước đó.` }, ...initialHistory.map((c) => ({ kind: 'cmd' as const, text: c, cwd: '' }))]
      : [{ kind: 'info', text: 'Gõ lệnh rồi nhấn Enter. Không dùng được vim/nano — hãy ghi file bằng echo, printf hoặc cat <<EOF.' }],
  );
  const [cwd, setCwd] = useState('/');
  const [cmd, setCmd] = useState('');
  const [busy, setBusy] = useState(false);
  const [recall, setRecall] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state when switching question
  useEffect(() => {
    setRunResult(null);
    if (!isTerminal) setScript(typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : shell.starterScript || '#!/bin/bash\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const handleScriptChange = useCallback((v: string) => {
    setScript(v);
    onAnswer({ questionId: question.id, answer: v });
  }, [onAnswer, question.id]);

  const runChecks = async (code: string) => {
    if (!code.trim()) { toast.error('Chưa có bài làm để chạy thử'); return; }
    setRunning(true);
    const res = await invokeShell({ mode: 'shell', shell, script: code });
    setRunning(false);
    if (!res.success) { toast.error(res.error || 'Lỗi khi chạy'); return; }
    setRunResult(res);
  };

  const submitCommand = async () => {
    const c = cmd.trim();
    if (!c || busy) return;
    setCmd('');
    setRecall(null);
    if (c === 'clear') { setLines([]); return; }
    if (history.length >= 200) { toast.error('Đã đạt giới hạn 200 lệnh. Hãy đặt lại môi trường nếu cần.'); return; }
    const next = [...history, c];
    setLines((l) => [...l, { kind: 'cmd', text: c, cwd }]);
    setBusy(true);
    const res = await invokeShell({ mode: 'terminal', shell, history: next });
    setBusy(false);
    if (!res.success) {
      setLines((l) => [...l.slice(0, -1), { kind: 'err', text: res.error || 'Lỗi' }]);
      setCmd(c);
      return;
    }
    const r = res as unknown as { output: string; cwd: string };
    setHistory(next);
    onAnswer({ questionId: question.id, answer: next });
    setCwd(r.cwd || '/');
    if (r.output) setLines((l) => [...l, { kind: 'out', text: r.output.replace(/\n$/, '') }]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submitCommand(); }
    else if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      const i = recall === null ? history.length - 1 : Math.max(0, recall - 1);
      setRecall(i); setCmd(history[i]);
    } else if (e.key === 'ArrowDown' && recall !== null) {
      e.preventDefault();
      const i = recall + 1;
      if (i >= history.length) { setRecall(null); setCmd(''); } else { setRecall(i); setCmd(history[i]); }
    }
  };

  const doReset = () => {
    setHistory([]);
    setCwd('/');
    setLines([{ kind: 'info', text: 'Đã đặt lại môi trường về trạng thái ban đầu.' }]);
    onAnswer({ questionId: question.id, answer: [] });
    setRunResult(null);
    setConfirmReset(false);
  };

  const setupList = shell.setupFiles?.filter((f) => f.path.trim()) || [];

  return (
    <div className="space-y-4">
      {setupList.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1.5 text-sm font-medium text-foreground">File có sẵn trong thư mục làm bài</p>
          <div className="flex flex-wrap gap-1.5">
            {setupList.map((f) => (
              <Badge key={f.path} variant="secondary" className="gap-1 font-mono text-xs">
                <FileText className="h-3 w-3" />{f.path}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!isTerminal ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
              <span className="font-mono text-sm text-muted-foreground">solution.sh</span>
              <Button size="sm" onClick={() => runChecks(script)} disabled={running} className="min-h-[40px] gap-1.5">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Chạy thử
              </Button>
            </div>
            <CodeMirror value={script} height="320px" theme={vscodeDark} onChange={handleScriptChange} basicSetup={{ lineNumbers: true }} />
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Terminal className="h-4 w-4" />Terminal · {history.length} lệnh</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)} disabled={busy} className="min-h-[40px] gap-1.5">
                <RotateCcw className="h-4 w-4" />Đặt lại môi trường
              </Button>
              <Button size="sm" onClick={() => runChecks(historyToScript(history))} disabled={running || busy} className="min-h-[40px] gap-1.5">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Kiểm tra
              </Button>
            </div>
          </div>
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[360px] overflow-y-auto bg-foreground p-3 font-mono text-sm text-background"
          >
            {lines.map((l, i) => (
              <div key={i} className={cn('whitespace-pre-wrap break-all', l.kind === 'err' && 'text-destructive', l.kind === 'info' && 'opacity-60 italic')}>
                {l.kind === 'cmd' ? <><span className="text-primary">sv@exam:~{l.cwd === '/' ? '' : l.cwd}$</span> {l.text}</> : l.text}
              </div>
            ))}
            <div className="flex items-center">
              <span className="mr-2 shrink-0 text-primary">sv@exam:~{cwd === '/' ? '' : cwd}$</span>
              <input
                ref={inputRef}
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={busy}
                spellCheck={false}
                autoComplete="off"
                aria-label="Nhập lệnh"
                className="flex-1 bg-transparent outline-none"
              />
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </div>
      )}

      {runResult && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">
            Kết quả chạy thử: {runResult.tests?.filter((t) => t.passed).length ?? 0}/{runResult.tests?.length ?? 0} bài kiểm tra công khai đạt
          </p>
          <TestResultList result={runResult} />
          {!isTerminal && (runResult.stdout || runResult.stderr) && (
            <pre className="max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs">
              {runResult.stdout}
              {runResult.stderr && <span className="text-destructive">{runResult.stderr}</span>}
            </pre>
          )}
          <p className="text-xs text-muted-foreground">Khi nộp bài, hệ thống còn chấm thêm các bài kiểm tra ẩn.</p>
        </div>
      )}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đặt lại môi trường?</AlertDialogTitle>
            <AlertDialogDescription>Toàn bộ lệnh đã gõ của câu này sẽ bị xóa và thư mục làm bài trở về trạng thái ban đầu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={doReset}>Đặt lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ShellQuestionDisplay;
