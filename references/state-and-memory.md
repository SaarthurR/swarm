# Swarm state & memory

A long run will compact. Machines restart. Without durable state you re-do
finished work or ship it twice. Two plain-markdown files under `.swarm/` at the
repo root — no database, no vector store. Ensure `.swarm/` is gitignored (add the
line if it's missing); never commit it.

## Run ledger — `.swarm/ledger.md`

Your source of truth for *this* run. Append-only, timestamped. Update it after
every phase transition and every item that changes state — this is cheap and it
is what lets you resume without re-doing anything.

Schema:

```
# Swarm run — <goal> — branch <branch> — started <ts>

## Phase: <current phase>

## Root causes
- [confirmed|refuted] <id>: <one line> — evidence: <path>

## Fixes
- [proposed|confirmed|in-progress|fixed|reviewed|verified] <id>: <one line>
  worktree: <path>   commits: <sha..>   report: <path>

## Open threads
- <sibling / edge case / regression still to chase>

## Decisions
- <decision + why>

## Blocked on human
- <the exact ask>
```

**Compaction / restart recovery (do this the moment you resume or notice context
was compacted):** STOP and re-read, before anything else —

1. `.swarm/ledger.md`
2. `git log --oneline` (what already landed)
3. `git status` and `git worktree list` (in-flight work)

Trust the ledger and git over your own recollection. Do not re-investigate
confirmed causes or re-apply landed fixes; pick up from the first unfinished item.

## Cross-run learnings — `.swarm/learnings.md`

Per-repo memory that persists across swarm runs (local, gitignored). Cheap, real
compounding — no DB required, stays ponytail-light.

**Search before (Phase 0):** if the file exists, read it first. Reuse: the repo
map / entry points, the build/test/lint commands that actually work, known-fragile
areas, recurring gotchas, and any model-tier notes for this repo. Don't re-derive
what's already known — spot-check it's still true, then build on it.

**Store after (run end, in Phase 6):** append only durable, reusable facts — not
this run's bug details. Good entries:

```
- 2026-07-15 test cmd: `pnpm -w test` (unit); `pnpm -w e2e` needs docker up
- 2026-07-15 entry point: apps/api/src/server.ts
- 2026-07-15 migrations are hand-run (`pnpm db:migrate`), never auto
- 2026-07-15 the billing module is fragile — touch with care, weak test coverage
```

Date each entry. If a stored fact proved wrong this run, correct it. Prune stale
lines. Only store what's likely still true next time.
