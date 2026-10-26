# Project rules

- Code execution (coding + Shell/Linux grading) goes through a self-hosted Piston instance configured by the `PISTON_API_URL` / `PISTON_API_KEY` secrets; the public emkc Piston API is whitelist-only and must not be relied on.
- Shell/Linux question harness (setup, run, checks, `__T:<id>:PASS|FAIL` markers, scoring) lives only in `supabase/functions/_shared/shell.ts`; `src/lib/shellScoring.ts` mirrors its scoring for the client — keep both in sync.
- Terminal-mode shell answers are stored as the command history array and graded by replaying it as one script, so grading is reproducible on a clean environment.
- Contest registration, approval, rejection and proof upload go through security-definer RPCs (`register_for_contest`, `approve_registration`, `reject_registration`, `submit_registration_proof`) to keep capacity checks and exam assignment atomic.
