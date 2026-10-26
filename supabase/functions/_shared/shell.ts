// Shared Shell/Linux exam harness: builds one bash script that sets up the
// environment, runs the student's work, then runs every check and prints
// machine-readable markers. Used by execute-code and grade-exam-background.

export type ShellTestKind =
  | 'stdout'
  | 'file_exists'
  | 'dir_exists'
  | 'file_content'
  | 'permission'
  | 'custom';

export interface ShellTest {
  id: string;
  kind: ShellTestKind;
  description?: string;
  target?: string; // path for file checks
  expected?: string; // expected text / permission / custom command
  weight?: number;
  isHidden?: boolean;
}

export interface ShellSetupFile {
  path: string;
  content: string;
  mode?: string; // e.g. "644"
}

export interface ShellConfig {
  mode: 'script' | 'terminal';
  setupFiles?: ShellSetupFile[];
  setupScript?: string;
  tests: ShellTest[];
  timeLimit?: number;
  scoringMethod?: 'proportional' | 'all-or-nothing';
}

export interface ShellTestResult {
  id: string;
  kind: ShellTestKind;
  description?: string;
  passed: boolean;
  weight: number;
  isHidden: boolean;
}

export interface ShellRunResult {
  tests: ShellTestResult[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s ?? '');
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const fromB64 = (s: string) => {
  try {
    const bin = atob(s.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
};

// Write a base64 payload into a file (safe against any quoting in content)
const writeB64 = (dest: string, content: string) =>
  `printf '%s' '${b64(content)}' | base64 -d > ${dest}`;

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');
const safeMode = (m?: string) => (m && /^[0-7]{3,4}$/.test(m) ? m : '');

/** Join a terminal history into a script. */
export function historyToScript(history: string[]): string {
  return history.filter((c) => c.trim()).join('\n');
}

export function buildGradingScript(
  config: ShellConfig,
  studentScript: string,
  includeHidden: boolean,
): string {
  const timeLimit = Math.min(Math.max(1, config.timeLimit || 5), 20);
  const tests = (config.tests || []).filter((t) => includeHidden || !t.isHidden);
  const lines: string[] = [
    'set +e',
    '__W=$(mktemp -d); __T=$(mktemp -d)',
    'cd "$__W"',
    `__norm(){ sed 's/[[:space:]]*$//' "$1" 2>/dev/null | awk 'NF{for(;b>0;b--)print "";print;next}{b++}'; }`,
  ];

  // Setup files
  for (const f of config.setupFiles || []) {
    const p = (f.path || '').trim();
    if (!p) continue;
    const q = `"$__W/${p.replace(/"/g, '')}"`;
    lines.push(`mkdir -p "$(dirname ${q})"`);
    lines.push(writeB64(q, f.content || ''));
    const m = safeMode(f.mode);
    if (m) lines.push(`chmod ${m} ${q}`);
  }
  // Setup script
  if (config.setupScript?.trim()) {
    lines.push(writeB64('"$__T/setup.sh"', config.setupScript));
    lines.push('bash "$__T/setup.sh" >/dev/null 2>&1');
  }

  // Student work (runs inside the workspace, in its own bash, with timeout)
  lines.push(writeB64('"$__T/sol.sh"', studentScript || ''));
  lines.push('cd "$__W"');
  lines.push(`timeout ${timeLimit} bash "$__T/sol.sh" > "$__T/out" 2> "$__T/err" < /dev/null`);
  lines.push('__ec=$?');
  lines.push('cd "$__W"');

  for (const t of tests) {
    const id = safeId(t.id);
    const target = `"$__W/${(t.target || '').replace(/"/g, '')}"`;
    let cond = 'false';
    switch (t.kind) {
      case 'stdout':
        lines.push(writeB64(`"$__T/exp_${id}"`, t.expected || ''));
        cond = `[ "$(__norm "$__T/out")" == "$(__norm "$__T/exp_${id}")" ]`;
        break;
      case 'file_exists':
        cond = `[ -f ${target} ]`;
        break;
      case 'dir_exists':
        cond = `[ -d ${target} ]`;
        break;
      case 'file_content':
        lines.push(writeB64(`"$__T/exp_${id}"`, t.expected || ''));
        cond = `[ -f ${target} ] && [ "$(__norm ${target})" == "$(__norm "$__T/exp_${id}")" ]`;
        break;
      case 'permission': {
        const m = safeMode((t.expected || '').trim());
        cond = m ? `[ -e ${target} ] && [ "$(stat -c %a ${target})" = "${m.replace(/^0(?=\d{3}$)/, '')}" ]` : 'false';
        break;
      }
      case 'custom':
        lines.push(writeB64(`"$__T/chk_${id}"`, t.expected || 'false'));
        cond = `(cd "$__W" && timeout 5 bash "$__T/chk_${id}" >/dev/null 2>&1)`;
        break;
    }
    lines.push(`if ${cond}; then echo "__T:${id}:PASS"; else echo "__T:${id}:FAIL"; fi`);
  }

  lines.push('echo "__EXIT:$__ec"');
  lines.push(`echo "__OUT:$(head -c 4000 "$__T/out" | base64 -w0)"`);
  lines.push(`echo "__ERR:$(head -c 2000 "$__T/err" | base64 -w0)"`);
  return lines.join('\n');
}

export function parseGradingOutput(
  config: ShellConfig,
  raw: string,
  includeHidden: boolean,
): ShellRunResult {
  const tests = (config.tests || []).filter((t) => includeHidden || !t.isHidden);
  const status = new Map<string, boolean>();
  let exitCode: number | null = null;
  let stdout = '';
  let stderr = '';
  for (const line of (raw || '').split('\n')) {
    const m = line.match(/^__T:([A-Za-z0-9_-]+):(PASS|FAIL)$/);
    if (m) status.set(m[1], m[2] === 'PASS');
    else if (line.startsWith('__EXIT:')) exitCode = Number(line.slice(7));
    else if (line.startsWith('__OUT:')) stdout = fromB64(line.slice(6));
    else if (line.startsWith('__ERR:')) stderr = fromB64(line.slice(6));
  }
  return {
    tests: tests.map((t) => ({
      id: t.id,
      kind: t.kind,
      description: t.description,
      passed: status.get(safeId(t.id)) === true,
      weight: t.weight && t.weight > 0 ? t.weight : 1,
      isHidden: !!t.isHidden,
    })),
    stdout,
    stderr,
    exitCode,
    timedOut: exitCode === 124,
  };
}

/** Score: proportional by weight, or all-or-nothing. */
export function scoreShell(
  results: ShellTestResult[],
  points: number,
  method: 'proportional' | 'all-or-nothing' = 'proportional',
) {
  const total = results.reduce((s, r) => s + r.weight, 0);
  const passed = results.filter((r) => r.passed).reduce((s, r) => s + r.weight, 0);
  const allPassed = results.length > 0 && results.every((r) => r.passed);
  let earned = 0;
  if (method === 'all-or-nothing') earned = allPassed ? points : 0;
  else earned = total > 0 ? Math.round((passed / total) * points * 100) / 100 : 0;
  return { earnedPoints: earned, isCorrect: allPassed, isPartial: !allPassed && earned > 0 };
}

/**
 * Interactive terminal step: replays previous commands silently, then runs
 * the last command and returns its output plus the resulting working dir.
 */
export function buildTerminalScript(config: ShellConfig, history: string[]): string {
  const prev = history.slice(0, -1);
  const last = history[history.length - 1] || '';
  const lines: string[] = ['set +e', '__W=$(mktemp -d); __T=$(mktemp -d)', 'cd "$__W"'];
  for (const f of config.setupFiles || []) {
    const p = (f.path || '').trim();
    if (!p) continue;
    const q = `"$__W/${p.replace(/"/g, '')}"`;
    lines.push(`mkdir -p "$(dirname ${q})"`);
    lines.push(writeB64(q, f.content || ''));
    const m = safeMode(f.mode);
    if (m) lines.push(`chmod ${m} ${q}`);
  }
  if (config.setupScript?.trim()) {
    lines.push(writeB64('"$__T/setup.sh"', config.setupScript));
    lines.push('bash "$__T/setup.sh" >/dev/null 2>&1');
  }
  // One driver script so `cd`, variables and functions persist across commands
  const driver = [
    ...prev.map((c) => `{ ${c}\n} >/dev/null 2>&1 < /dev/null`),
    'echo "__BEGIN__"',
    `{ ${last}\n} 2>&1 < /dev/null`,
    'echo "__PWD:${PWD#$__W}"',
  ].join('\n');
  lines.push(writeB64('"$__T/drv.sh"', driver));
  lines.push('export __W');
  lines.push('cd "$__W" && timeout 8 bash "$__T/drv.sh" | head -c 20000');
  return lines.join('\n');
}

export function parseTerminalOutput(raw: string): { output: string; cwd: string } {
  const idx = raw.indexOf('__BEGIN__');
  let body = idx >= 0 ? raw.slice(idx + '__BEGIN__'.length).replace(/^\n/, '') : raw;
  let cwd = '';
  const m = body.match(/\n?__PWD:(.*)\s*$/);
  if (m) {
    cwd = m[1].trim();
    body = body.slice(0, m.index);
  }
  return { output: body, cwd: cwd || '/' };
}
