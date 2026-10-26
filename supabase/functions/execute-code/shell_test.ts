import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseGradingOutput, scoreShell, historyToScript, type ShellConfig } from "../_shared/shell.ts";

const cfg: ShellConfig = {
  mode: "script",
  tests: [
    { id: "a", kind: "stdout", expected: "2", weight: 1 },
    { id: "b", kind: "file_exists", target: "x", weight: 3, isHidden: true },
  ],
};

Deno.test("practice runs exclude hidden checks", () => {
  const r = parseGradingOutput(cfg, "__T:a:PASS\n__EXIT:0", false);
  assertEquals(r.tests.map((t) => t.id), ["a"]);
});

Deno.test("proportional score uses weights", () => {
  const r = parseGradingOutput(cfg, "__T:a:PASS\n__T:b:FAIL\n__EXIT:0", true);
  assertEquals(scoreShell(r.tests, 8).earnedPoints, 2); // 1 of 4 weight
});

Deno.test("all-or-nothing gives zero unless every check passes", () => {
  const r = parseGradingOutput(cfg, "__T:a:PASS\n__T:b:FAIL", true);
  assertEquals(scoreShell(r.tests, 8, "all-or-nothing").earnedPoints, 0);
});

Deno.test("timeout exit code 124 is flagged", () => {
  assertEquals(parseGradingOutput(cfg, "__EXIT:124", true).timedOut, true);
});

Deno.test("terminal history becomes a script, blank lines dropped", () => {
  assertEquals(historyToScript(["cd a", " ", "ls"]), "cd a\nls");
});
