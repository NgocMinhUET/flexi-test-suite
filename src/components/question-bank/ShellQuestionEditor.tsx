import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Plus, Trash2, Play, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ShellQuestion, ShellTest, ShellTestKind } from '@/types/exam';
import { describeShellTest, shellTestKindLabels, type ShellRunResponse } from '@/lib/shellScoring';

export interface ShellAnswerData extends ShellQuestion {
  sampleSolution?: string;
  explanation?: string;
}

export const defaultShellAnswerData = (): ShellAnswerData => ({
  mode: 'script',
  setupFiles: [],
  setupScript: '',
  tests: [{ id: 't1', kind: 'stdout', expected: '', weight: 1, isHidden: false }],
  timeLimit: 5,
  scoringMethod: 'proportional',
  starterScript: '#!/bin/bash\n',
  sampleSolution: '',
});

const newId = () => 't' + Math.random().toString(36).slice(2, 8);

interface Props {
  value: ShellAnswerData;
  onChange: (v: ShellAnswerData) => void;
}

export function validateShellAnswerData(v: ShellAnswerData): string | null {
  if (!v.tests.length) return 'Vui lòng thêm ít nhất một bài kiểm tra';
  for (const t of v.tests) {
    if (['file_exists', 'dir_exists', 'file_content', 'permission'].includes(t.kind) && !t.target?.trim())
      return 'Bài kiểm tra file/thư mục cần nhập đường dẫn';
    if (t.kind === 'permission' && !/^[0-7]{3,4}$/.test((t.expected || '').trim()))
      return 'Quyền truy cập phải ở dạng số, ví dụ 644';
    if (t.kind === 'custom' && !t.expected?.trim()) return 'Lệnh kiểm tra tùy chỉnh không được để trống';
  }
  return null;
}

export function ShellQuestionEditor({ value, onChange }: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ShellRunResponse | null>(null);
  const set = (patch: Partial<ShellAnswerData>) => onChange({ ...value, ...patch });
  const setTest = (id: string, patch: Partial<ShellTest>) =>
    set({ tests: value.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const runSample = async () => {
    if (!value.sampleSolution?.trim()) { toast.error('Vui lòng nhập lời giải mẫu'); return; }
    const err = validateShellAnswerData(value);
    if (err) { toast.error(err); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('execute-code', {
      body: { mode: 'shell', shell: value, script: value.sampleSolution, includeHidden: true },
    });
    setTesting(false);
    const res = data as ShellRunResponse;
    if (error || !res?.success) { toast.error(res?.error || 'Không chạy được lời giải mẫu'); return; }
    setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Chế độ làm bài</Label>
          <Select value={value.mode} onValueChange={(v) => set({ mode: v as ShellAnswerData['mode'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="script">Viết script Bash</SelectItem>
              <SelectItem value="terminal">Terminal tương tác</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Giới hạn thời gian chạy (giây)</Label>
          <Input type="number" min={1} max={20} value={value.timeLimit || 5} onChange={(e) => set({ timeLimit: Math.min(20, Math.max(1, Number(e.target.value) || 5)) })} />
        </div>
        <div className="space-y-2">
          <Label>Cách tính điểm</Label>
          <Select value={value.scoringMethod || 'proportional'} onValueChange={(v) => set({ scoringMethod: v as ShellAnswerData['scoringMethod'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="proportional">Theo trọng số bài kiểm tra đạt</SelectItem>
              <SelectItem value="all-or-nothing">Đạt hết mới có điểm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Setup files */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">File có sẵn trong thư mục làm bài</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => set({ setupFiles: [...value.setupFiles, { path: '', content: '', mode: '' }] })}>
            <Plus className="mr-1 h-4 w-4" />Thêm file
          </Button>
        </div>
        {value.setupFiles.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <Input placeholder="Đường dẫn, ví dụ data/log.txt" value={f.path} className="font-mono"
                onChange={(e) => set({ setupFiles: value.setupFiles.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)) })} />
              <Input placeholder="Quyền (vd 644)" value={f.mode || ''} className="w-32 font-mono"
                onChange={(e) => set({ setupFiles: value.setupFiles.map((x, j) => (j === i ? { ...x, mode: e.target.value } : x)) })} />
              <Button type="button" variant="ghost" size="icon" aria-label="Xóa file"
                onClick={() => set({ setupFiles: value.setupFiles.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea rows={4} className="font-mono text-sm" placeholder="Nội dung file" value={f.content}
              onChange={(e) => set({ setupFiles: value.setupFiles.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)) })} />
          </div>
        ))}
        <div className="space-y-2">
          <Label>Lệnh khởi tạo thêm (không bắt buộc)</Label>
          <Textarea rows={3} className="font-mono text-sm" placeholder="mkdir -p logs && touch logs/a.log"
            value={value.setupScript || ''} onChange={(e) => set({ setupScript: e.target.value })} />
        </div>
      </div>

      {value.mode === 'script' && (
        <div className="space-y-2">
          <Label>Script khởi đầu cho sinh viên</Label>
          <div className="overflow-hidden rounded-lg border border-border">
            <CodeMirror value={value.starterScript || ''} height="120px" theme={vscodeDark} onChange={(v) => set({ starterScript: v })} />
          </div>
        </div>
      )}

      {/* Tests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Bài kiểm tra chấm điểm</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => set({ tests: [...value.tests, { id: newId(), kind: 'file_exists', target: '', weight: 1, isHidden: false }] })}>
            <Plus className="mr-1 h-4 w-4" />Thêm bài kiểm tra
          </Button>
        </div>
        {value.tests.map((t, idx) => (
          <div key={t.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
              <Select value={t.kind} onValueChange={(v) => setTest(t.id, { kind: v as ShellTestKind })}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(shellTestKindLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min={1} className="w-24" value={t.weight || 1} aria-label="Trọng số"
                onChange={(e) => setTest(t.id, { weight: Math.max(1, Number(e.target.value) || 1) })} />
              <Button type="button" size="sm" variant={t.isHidden ? 'secondary' : 'outline'} onClick={() => setTest(t.id, { isHidden: !t.isHidden })}>
                {t.isHidden ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
                {t.isHidden ? 'Ẩn' : 'Công khai'}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Xóa bài kiểm tra"
                disabled={value.tests.length === 1} onClick={() => set({ tests: value.tests.filter((x) => x.id !== t.id) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input placeholder="Mô tả hiển thị cho sinh viên (không bắt buộc)" value={t.description || ''}
              onChange={(e) => setTest(t.id, { description: e.target.value })} />
            {['file_exists', 'dir_exists', 'file_content', 'permission'].includes(t.kind) && (
              <Input placeholder="Đường dẫn trong thư mục làm bài, ví dụ out/result.txt" className="font-mono" value={t.target || ''}
                onChange={(e) => setTest(t.id, { target: e.target.value })} />
            )}
            {t.kind === 'permission' && (
              <Input placeholder="Quyền mong đợi, ví dụ 640" className="font-mono" value={t.expected || ''}
                onChange={(e) => setTest(t.id, { expected: e.target.value })} />
            )}
            {(t.kind === 'stdout' || t.kind === 'file_content') && (
              <Textarea rows={3} className="font-mono text-sm"
                placeholder={t.kind === 'stdout' ? 'Kết quả in ra mong đợi' : 'Nội dung file mong đợi'}
                value={t.expected || ''} onChange={(e) => setTest(t.id, { expected: e.target.value })} />
            )}
            {t.kind === 'custom' && (
              <Textarea rows={2} className="font-mono text-sm" placeholder="Lệnh Bash, đạt khi chạy thành công. Ví dụ: grep -q ERROR out/err.txt"
                value={t.expected || ''} onChange={(e) => setTest(t.id, { expected: e.target.value })} />
            )}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Khoảng trắng cuối dòng và dòng trống cuối được bỏ qua khi so sánh.</p>
      </div>

      {/* Sample solution */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Lời giải mẫu (chỉ giáo viên thấy)</Label>
          <Button type="button" size="sm" onClick={runSample} disabled={testing}>
            {testing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
            Chạy thử với lời giải mẫu
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <CodeMirror value={value.sampleSolution || ''} height="140px" theme={vscodeDark} onChange={(v) => set({ sampleSolution: v })} />
        </div>
        {result?.tests && (
          <div className="space-y-1.5 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{result.tests.filter((x) => x.passed).length}/{result.tests.length} bài kiểm tra đạt</p>
            {result.tests.map((r) => {
              const t = value.tests.find((x) => x.id === r.id) || r;
              return (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  {r.passed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  {describeShellTest(t)}{r.isHidden && <span className="text-xs text-muted-foreground">(ẩn)</span>}
                </div>
              );
            })}
            {(result.stdout || result.stderr) && (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">{result.stdout}{result.stderr}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ShellQuestionEditor;
