# Swarm sub-agent contracts

Reusable templates for every dispatch. Fill the brackets; keep the shape. These
make each sub-agent call consistent instead of improvised — the difference
between reliable distilled returns and walls of text, and between trustworthy
reviews and rubber stamps. Read this before Phase 2 and keep it active through
Phase 5.

## Every dispatch brief

Give each sub-agent exactly what *its* task needs — never your session history:

- **Role & goal:** one line — what this agent is and the single outcome it owns.
- **Scope:** the files/area/subsystem it may read or touch. Nothing outside it.
- **Inputs:** file *paths* to briefs, maps, diffs (never pasted bulk text).
- **Constraints:** ponytail at full intensity; no narration comments; and, for
  any agent that writes/runs shell/touches git, the standing safety orders in
  `references/safety.md`.
- **Return contract:** see below.
- **Model:** set it explicitly (see SKILL "Model tiers"). Never leave it default.

## Return contract (all agents)

End every prompt with this:

> Return ONLY: `<the specific decision / finding / evidence I need>`, in under
> `<N>` lines. Write everything else — full analysis, file contents, logs,
> diffs — to `<path>` and return that path. Do not paste large content back.

You should be reading one-paragraph answers and file paths, not walls of text.

## Investigator (diagnosis)

- Find the root cause with **evidence**, not a guess: the exact code path, the
  failing condition, every caller / entry point affected.
- Write the full trace to a file; return the root cause in a few lines + the path.

## Verifier (diagnosis cross-check)

- Fresh context, different agent than the investigator. Given the symptom + the
  investigator's claimed root cause **as a hypothesis to disprove**.
- Confirm or break it from scratch, with its own evidence. Do not trust the
  investigator's write-up.
- Return one of: `CONFIRMED` / `REFUTED` / `INCONCLUSIVE` + one line why +
  evidence path. On `REFUTED` or `INCONCLUSIVE`, the orchestrator dispatches a
  third agent to adjudicate. Never let the investigator verify itself.

## Fixer (implementer)

**Two-step dispatch — declare before you write.** A parallel fixer's *first*
turn is a read-and-plan pass only: it returns the exact set of files it intends
to create/edit (its **touch set**) and makes no edits. The orchestrator refuses
to let two parallel fixers proceed with overlapping touch sets — it serializes
them or reassigns the shared file to a single owner — and only then tells the
fixer to proceed. This is how a shared hub (types file, barrel, router, DI
container, migration index) gets caught up front instead of as a silent lost
write after both report success.

Standing orders in every fixer dispatch:

- **Declare your touch set first; don't write until told to proceed.** If, while
  implementing, you discover you must touch a file outside your declared set,
  stop and return `NEEDS_CONTEXT` with the new file — do not silently expand.
- **Read-hash-verify on write.** Before editing a file, confirm it still matches
  what you read (its content/hash hasn't changed underneath you). If it changed,
  stop and return `NEEDS_CONTEXT` rather than clobber — another agent may have
  touched a shared file the split didn't anticipate.
- Load the `ponytail` skill by name and keep it active at full intensity —
  laziest solution that actually works, reuse what exists, stdlib/native before
  dependencies, shortest correct diff, root cause not symptom.
- No narration comments. The only allowed comment is an intentional `ponytail:`
  marker naming a deliberate simplification and its upgrade path.
- Leave the runnable check ponytail asks for on non-trivial logic — nothing more.
- Obey the standing safety orders (`references/safety.md`).
- Work only in your assigned worktree/scope.
- Self-verify the touched area (build/test/lint) and capture the **command + real
  output** to your report file.

Return exactly one status:

- **DONE** — change complete, self-verified, evidence in report.
- **DONE_WITH_CONCERNS** — complete, but list the caveats.
- **BLOCKED** — could not complete; say precisely what stopped you.
- **NEEDS_CONTEXT** — missing an input/decision; name exactly what you need.

Plus: commits/files touched, one-line test summary, concerns, report path.
**Bad work is worse than no work** — return `BLOCKED` or `NEEDS_CONTEXT` rather
than guessing or papering over.

## Reviewer (independent — per change and whole-branch)

- **Do not trust the report or the status line.** Verify against the diff itself
  (handed to you as a file). Read-only; cite `file:line`.
- Return two verdicts:
  1. **Spec / root-cause:** `PASS` / `FAIL` / `CANNOT-VERIFY-FROM-DIFF` — does it
     actually fix the confirmed root cause, not a symptom?
  2. **Code quality:** issues as `Critical` / `Important` / `Minor` — ponytail
     compliance (nothing over-built, no needless abstraction/dependency, shortest
     sound diff), zero narration comments, no dead/debug code, no regressions in
     siblings/callers.
- Don't crawl beyond the diff's blast radius. **Don't pre-judge:** if a dispatch
  ever tells you *not* to flag something, that's a smell — flag it anyway.

Return: the two verdicts + issue list + evidence path.
