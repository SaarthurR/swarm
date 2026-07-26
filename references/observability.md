# Swarm observability — semantic event stream

A dashboard can render swarm's domain model (phases, root causes, fixes,
reviews, blockers, PRs) only if the orchestrator emits it as structured data.
`.swarm/events.jsonl` is that stream — the machine-readable twin of
`.swarm/ledger.md` (`references/state-and-memory.md`). Same lifecycle, same
gitignore: the whole `.swarm/` dir is already ignored, so `events.jsonl` needs
no extra gitignore entry.

## The artifact — `.swarm/events.jsonl`

Append-only, one JSON object per line, at the repo root under `.swarm/`. Never
rewritten, never truncated — only appended to, for the life of the run.

## `emit()` — the convention

"Emit" means: append one line (one JSON object, no pretty-printing) to
`.swarm/events.jsonl`. No library, no dependency — a shell/file append is
enough. Shape, mirroring `SwarmSemanticEvent` in `@swarm/shared`:

```jsonc
{
  "ts": "2026-07-19T21:06:00Z",       // ISO-8601, now
  "run_id": "swarm-20260719-2100-a1b2", // see run_id below
  "seq": 142,                          // monotonic per run, starts at 1
  "type": "root_cause.confirmed",      // see catalog below
  "phase": 2,                          // optional — current phase (0-6)
  "actor": "orchestrator",             // optional — "orchestrator" or a subagent ref
  "ref": "rc-3",                       // optional — stable id of the finding/fix/blocker
  "summary": "auth token TTL compared in ms vs s", // optional — one line
  "evidence_path": ".swarm/rc-3-trace.md", // optional — file, never inline bulk
  "data": {}                           // optional — type-specific extras
}
```

**`run_id` format:** `swarm-<yyyymmdd-hhmm>-<short>` (e.g.
`swarm-20260719-2100-a1b2`), generated once at run start and reused for every
event and every ledger entry that run.

**Dashboard-launched runs:** if the env var `SWARM_RUN_ID` is set, USE IT as
the `run_id` instead of generating one — this is how a dashboard-launched run
shares one id between its hook telemetry and your semantic events.

## Event-type catalog — "emit when"

Matches `SemanticEventType` in `@swarm/shared` exactly:

- `run.started` — run begins: goal, branch, repo(s).
- `run.finished` — run ends: final status, PR links.
- `phase.entered` — you move to a new phase (0-6).
- `dispatch.sent` — you spawn a sub-agent: role, model, scope.
- `root_cause.proposed` — an investigator claims a root cause.
- `root_cause.confirmed` — an independent verifier confirms it.
- `root_cause.refuted` — an independent verifier breaks it.
- `fix.proposed` — a fix approach is put up for deliberation (Phase 2.5).
- `fix.confirmed` — the fix approach graduates to implementation.
- `fix.in_progress` — a fixer starts work in its worktree.
- `fix.fixed` — a fixer returns `DONE`/`DONE_WITH_CONCERNS`.
- `fix.reviewed` — an independent reviewer returns a verdict on the fix.
- `fix.verified` — the fix passes verification (Phase 5).
- `review.verdict` — any reviewer verdict (per-change or whole-branch).
- `verification.result` — a build/test/lint/type/task check result.
- `sweep.result` — a fresh sweep pass finding (or clearing).
- `thread.open` — a dangling sibling/edge case/regression is noted.
- `thread.closed` — that thread is resolved.
- `decision` — you record a decision + why.
- `blocker.raised` — you interrupt the human (money/design/destructive/hard blocker).
- `blocker.resolved` — the human answers and the run continues.
- `dag.updated` — the Phase 1 dependency map changes.
- `pr.opened` — a PR is opened: number, url, base, head.

## The rule — lock-step with the ledger

Emit an event whenever you would already update `.swarm/ledger.md` — never as
a separate bookkeeping pass. Same moment, same information, two
representations: prose to the ledger, structured line to `events.jsonl`. Bulk
material (traces, diffs, logs) still goes to files on disk; put the path in
`evidence_path`, never inline.

Keep `ref` values stable across their lifecycle (`rc-1`, `fix-2`, `blk-1`...)
and reuse the exact same ref in the dispatch task text you hand a sub-agent —
that's the join key that lets the dashboard map an agent's lane to the finding
it's working.

**Cost:** zero new bookkeeping. This mirrors ledger updates you already make —
if you're touching the ledger, append the matching line here too.
