# PRD — Swarm Mission Control

A local-first dashboard and control surface for the `swarm` skill. See every agent —
the orchestrator and its sub-agents — what each is thinking, what it's doing, and where
the run stands, in real time. Drive the whole thing from the dashboard instead of the
Cursor chat: launch a run, answer the questions it gets stuck on, approve the gated
actions, and watch it converge.

Status: Draft v1 · Owner: Saarth · Last updated: 2026-07-19

---

## 1. Problem

The `swarm` skill is an autonomous orchestrator. It fans out dozens of isolated
sub-agents (recon, investigators, verifiers, fixers, reviewers) across phases 0–6,
routes distilled findings between them, cross-checks every conclusion, and doesn't stop
until the work is verified production-ready. It already keeps durable state in
`.swarm/ledger.md` and `.swarm/learnings.md`.

The problem is **visibility and control**:

- When a run is underway, the Cursor chat shows a linear stream of tool calls. You can't
  see the *shape* of the operation — which agents are alive right now, what each is
  working on, what it concluded, how the fixes are progressing, what's blocking.
- The interesting state (root causes confirmed vs. refuted, fixes moving through
  proposed → verified, review verdicts, the DAG of parallel work, worktrees/branches) is
  buried in a prose ledger and in dozens of sub-agent transcript files.
- To interact with a run you have to sit inside Cursor and read chat. There's no way to
  kick off a swarm, answer its one blocking question, approve a money/destructive gate,
  or steer it from a purpose-built surface.

We want a **mission-control dashboard** — the primary way to run and observe swarm —
without adding slop. Every pixel must earn its place against a real question the operator
is actually asking mid-run.

## 2. Vision

One screen that answers, at a glance:

1. **Where is the run?** Which phase, how long, converging or flapping.
2. **Who is alive?** The orchestrator plus every sub-agent, each showing its role, model,
   task, live status, git worktree/branch, and its latest thought/action.
3. **What has it concluded?** Root causes (hypothesis → confirmed/refuted), fixes and
   their state, review verdicts, verification evidence — swarm's actual domain objects,
   not a raw tool-call firehose.
4. **What does it need from me?** Blocking questions, money gates, destructive-action
   approvals — surfaced as actionable cards, answerable in place.

And one input box that lets you **launch and steer** a run headlessly, so the dashboard
replaces the Cursor chat as the cockpit.

## 3. Goals / Non-goals

### Goals

- **G1 — Live fleet view.** Real-time view of the orchestrator + all sub-agents with
  role, model, status, worktree/branch, current thought, current tool action.
- **G2 — Semantic run state.** Render swarm's domain model (phases, root causes, fixes,
  reviews, verification, threads, PRs) — not just generic tool events.
- **G3 — Drive from the dashboard.** Launch a swarm run from an input box (headless
  Cursor agent), stream it, send follow-ups, without opening Cursor chat.
- **G4 — Human-in-the-loop.** Surface swarm's interrupts (money / design fork /
  destructive / hard blocker) as cards and let the operator answer/approve/deny in place,
  routed back into the run.
- **G5 — Local-first & zero-friction.** Runs on the operator's machine, no cloud, no
  signup, no telemetry leaving the box. One command to start. If the dashboard is down,
  swarm runs unaffected.
- **G6 — Trustworthy.** The dashboard reflects verified reality (git diff, real command
  output, ledger) — never an agent's unverified status line. It inherits swarm's "trust
  the evidence, not the report" ethos.

### Non-goals (explicit anti-slop line)

- **No vanity metrics / gamification.** No "cute buddy", no streaks, no leaderboard, no
  achievement badges. (These appear in some existing tools; they're slop here.)
- **Not a generic multi-project APM.** Scope is swarm runs, not "observe every Cursor
  session you've ever run." Generic session history is at most a thin secondary view.
- **Not a re-implementation of Cursor's chat.** We don't render every token of every
  message by default. We render distilled state and let you drill into a transcript when
  you want it.
- **No editing code in the dashboard.** Review/merge stays in git/Cursor/GitHub. The
  dashboard shows diffs read-only and links out.
- **No new orchestration engine.** swarm (the skill) remains the brain. The dashboard
  observes and steers it; it does not replace its logic.

## 4. Users & primary use cases

**Primary user:** Saarth — running swarm on real repos (warmstack, grant_scraper,
lead-scraper, frizzle-fun) and wanting to supervise long autonomous runs without babysitting chat.

**User stories:**

- *As the operator*, I type a goal into the dashboard, pick the repo, and hit run — a
  swarm run starts headlessly and I watch it work.
- *As the operator mid-run*, I glance at the board and instantly see 6 sub-agents alive:
  2 investigators, 2 verifiers, a fixer in worktree `swarm/fix-auth`, and the orchestrator
  in Phase 3, and I can read what the fixer is currently thinking.
- *As the operator*, swarm hits a money gate ("provisioning a Render Postgres costs $$").
  A card pops up on the dashboard; I click Approve, and the run continues — I never opened
  Cursor.
- *As the operator after coffee*, I come back to a converged run: green verification
  evidence, the PR link (or stack, bottom-to-top with merge order), and the
  "What I need from you" handoff rendered as a checklist.
- *As the operator debugging a flapping run*, I see a fix that's bounced through
  fix→review→verify 3× and open its two reviewer verdicts side by side to see the
  disagreement.

## 5. Competitive landscape — what to steal, what to skip

Researched July 2026. Summary of the field and the explicit lift/avoid decision.

| Tool | What it does well (steal) | What to avoid |
| --- | --- | --- |
| **disler / ajbmachon multi-agent-observability** (Bun+SQLite+WS+Vue, ~1.5k★) | The canonical hook→server→WebSocket→client pipeline. **Agent swim lanes** (parallel agents side by side), **live pulse chart**, event timeline w/ auto-scroll, multi-select filters, chat-transcript drill-in, tool-emoji legend. Local-first, hooks always exit 0 so they never block the agent. | Generic tool-event firehose is the *only* layer — no domain model. We add the semantic layer on top. |
| **Claude Code Agent Monitor** (hoangsonww; React+Electron+MCP) | **Collapsible sub-agent hierarchy** (`main › coder › explorer`), Kanban status board, error-propagation map, WebSocket push (no polling), spawn/resume from browser, 100% local. | "Cute buddy", 12-tab config explorer, and broad "observe everything" scope = feature sprawl. Cut. |
| **ObservAgent** | **Cost/token/latency per model**, SSE stream, agent tree, budget thresholds, session export. Clean REST surface (`/ingest`, `/events` SSE, `/api/agents`, `/api/cost`). | Cost-first framing; for us cost is a secondary panel, not the headline. |
| **Vibe Kanban / Conductor / Nimbalyst / Claude Squad** | **Parallel-agents-as-board** mental model, **git-worktree isolation per task** (exactly how swarm Phase 3 already works), built-in **diff review**, pause/resume/stop controls, prompt-an-agent-from-the-UI. | Board-centric task management is a different product; swarm already owns the DAG. Borrow the worktree/diff/control surface, not the PM layer. |
| **LangGraph Studio / CrewAI Studio / AutoGen Studio** | **Graph/DAG visualization** of the workflow, **time-travel debugging**, explicit human-in-the-loop pause nodes, state inspection at each node. | Heavy framework-authoring UIs. We only need the read-only DAG render + HITL, not a visual workflow builder. |

**The synthesis:** the winning pattern in the field is *hook-driven local pipeline +
swim-lane fleet view + drill-into-transcript*. Nobody in the field renders a **semantic
domain model of an autonomous debugging run** because their agents don't have one. Swarm
*does* (phases, cross-verified root causes, a fix state machine, review verdicts,
verification evidence). **That domain model is our differentiator and the thing that makes
this genuinely useful instead of another pretty event log.**

## 6. The core insight

> The generic hook stream (tool calls, file edits, shell output) is the *substrate*. It's
> low-value on its own — a scrolling wall. The **high-value layer is swarm's own domain
> model**. The dashboard's job is to render that model and use the raw stream only as
> evidence you drill into.

Concretely, the two data planes:

1. **Automatic telemetry (free, via Cursor hooks):** subagent start/stop, agent
   thoughts, agent responses, prompts, tool calls, shell output, compaction, stop. We get
   this for zero changes to a sub-agent's behavior. It answers "who's alive, what are they
   thinking/doing right now."
2. **Semantic events (emitted by the swarm skill):** phase transitions, root cause
   confirmed/refuted, fix state changes, review verdicts, verification evidence, blockers,
   PRs. This is the layer that makes the dashboard readable. It requires a small, bounded
   addition to the skill (§8).

The dashboard **fuses** the two: the semantic layer is the skeleton (phases, findings,
fixes); the telemetry layer hangs off it (this fixer's live thoughts, this investigator's
shell output) and is reachable on drill-in.

## 7. Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │  Cursor (IDE, CLI headless, or SDK run)       │
                    │  running the `swarm` skill                    │
                    │                                               │
   launch / steer   │   orchestrator ──► Task ──► sub-agents        │
  ────────────────► │        │                    (parallel)        │
  (SDK / CLI)       │        │                                      │
                    └────────┼──────────────────────┬──────────────┘
                             │                       │
              (A) semantic   │        (B) hook events│  (fires on every
              events emitted │        via ~/.cursor/ │   lifecycle point)
              to event log   │        hooks.json     │
                             ▼                       ▼
                    ┌───────────────────────────────────────┐
                    │  Collector                            │
                    │  • hook scripts → POST /ingest        │
                    │  • tail .swarm/events.jsonl           │
                    │  • read .swarm/ledger.md, learnings   │
                    │  • git (worktrees, branches, diffs)   │
                    └───────────────┬───────────────────────┘
                                    │
                    ┌───────────────▼───────────────────────┐
                    │  Local server (SQLite + WS/SSE)        │
                    │  ingest · normalize · store · broadcast│
                    │  control API (launch/answer/stop)      │
                    └───────────────┬───────────────────────┘
                                    │ WebSocket push
                    ┌───────────────▼───────────────────────┐
                    │  Dashboard client (browser, localhost) │
                    │  fleet · findings · timeline · console │
                    └────────────────────────────────────────┘
```

### Components

- **Collector (data in).** Three sources feed the server:
  - **Cursor hooks** (`~/.cursor/hooks.json`, schema v1). A single `swarm-emit` script
    wired to the lifecycle events (§7.1) reads the JSON on stdin, tags it with the run id,
    and `POST`s to `http://127.0.0.1:<port>/ingest`. **Always exits 0** so it never blocks
    or slows the agent, even if the server is down (events resume when it's back). This is
    the disler pattern, proven.
  - **Semantic event stream** `.swarm/events.jsonl` — the swarm skill appends one JSON
    object per domain event (§8). The collector tails it. (Also survives if hooks are off.)
  - **Repo state** — `.swarm/ledger.md`, `.swarm/learnings.md`, and `git`
    (`worktree list`, `log`, `diff`) read on demand for the ledger view and diff drawer.
- **Server (state + fan-out).** Small local service. Ingests both planes, normalizes into
  a unified event table + derived run/agent/finding/fix tables, persists to SQLite (WAL),
  and broadcasts over WebSocket to connected clients. Also exposes the **control API**.
- **Client (data out).** Browser SPA on localhost. Subscribes to the WS stream, renders
  the views in §9, and calls the control API to launch/steer.
- **Control plane (data back in).** How the dashboard drives swarm — §10.

### 7.1 Cursor hooks we consume (all confirmed available, schema v1)

| Hook | Why we want it | Key payload fields |
| --- | --- | --- |
| `subagentStart` | A sub-agent was spawned → create a lane | `subagent_id`, `subagent_type`, `task`, `parent_conversation_id`, `subagent_model`, `is_parallel_worker`, `git_branch` |
| `subagentStop` | Sub-agent finished/errored/aborted → close lane, capture output | `subagent_id`, `status`, `summary`, `message_count`, `tool_call_count`, `modified_files`, `agent_transcript_path` |
| `afterAgentThought` | "What it's thinking" | reasoning text + `conversation_id`, `generation_id` |
| `afterAgentResponse` | "What it concluded/said this turn" | response text |
| `beforeSubmitPrompt` | The prompt each agent was actually given | prompt text |
| `preToolUse` / `postToolUse` / `postToolUseFailure` | "What it's doing" + failures | `tool_name`, args, result, failure |
| `beforeShellExecution` / `afterShellExecution` | Command + real output (verification evidence) | `command`, `output`, `duration` |
| `beforeMCPExecution` / `afterMCPExecution` | MCP calls (Supabase/Render/etc. state pulls) | `tool_name`, `tool_input`, `result_json`, `duration` |
| `preCompact` | Context compaction happened (explains "why did it re-read the ledger") | trigger |
| `stop` | Orchestrator turn complete | `conversation_id`, `status`, `loop_count` |

All agent hooks carry `conversation_id` (stable across turns) and `generation_id`
(per user message), which we use to thread events to the right agent lane.

**Gating hooks (control):** `subagentStart` and `beforeShellExecution`/`beforeMCPExecution`
can return `permission: allow|deny`. This is the lever for dashboard-driven approval of
money/destructive gates (§10).

> Note: user-level hooks (`~/.cursor/hooks.json`) run for **local** IDE/CLI runs. For
> **cloud** agent runs, hooks must be committed to the repo's `.cursor/hooks.json`. MVP
> targets local runs; cloud is a V2 consideration.

## 8. Required change to the `swarm` skill (the semantic layer)

To make the dashboard readable instead of a tool-call wall, the skill must emit a small,
structured event stream. This is a **bounded** addition — a new reference file plus a few
lines in each phase telling the orchestrator to append an event when domain state changes.
It stays ponytail-light: plain JSONL appended to a file, no dependency.

**New artifact:** `.swarm/events.jsonl` (gitignored, alongside the existing ledger). One
JSON object per line, append-only, timestamped. The orchestrator writes an event whenever
it would already update the ledger — the ledger and event stream stay in lock-step (the
event stream is the machine-readable twin of the human-readable ledger).

**Event schema (v1):**

```jsonc
{
  "ts": "2026-07-19T21:06:00Z",
  "run_id": "swarm-20260719-2100",       // stable per run
  "seq": 142,                             // monotonic per run
  "type": "root_cause.confirmed",         // see catalog below
  "phase": 2,
  "actor": "orchestrator",                // or a subagent_id
  "ref": "rc-3",                          // stable id of the finding/fix
  "summary": "auth token TTL compared in ms vs s",
  "evidence_path": ".swarm/rc-3-trace.md",// file, never inline bulk
  "data": { }                             // type-specific extras
}
```

**Event type catalog (v1):**

- `run.started` / `run.finished` — goal, branch, repos; final status + PR links.
- `phase.entered` — `{ phase: 0..6, name }`.
- `dispatch.sent` — the orchestrator spawned an agent: `{ role, model, scope }`.
  (Correlates with the `subagentStart` hook via task text / branch.)
- `root_cause.proposed` / `.confirmed` / `.refuted` — with evidence path and the
  investigator/verifier verdict.
- `fix.proposed` / `.confirmed` / `.in_progress` / `.fixed` / `.reviewed` / `.verified` —
  the fix state machine, with worktree/branch/commits.
- `review.verdict` — `{ ref, spec: PASS|FAIL|CANNOT_VERIFY, quality_issues: [...] }`.
- `verification.result` — `{ check: build|test|lint|types|task, status, evidence_path }`.
- `sweep.result` — `{ found: n, refs: [...] }` (the "sweep again" loop).
- `thread.open` / `thread.closed` — dangling siblings/edges.
- `decision` — `{ text, why }`.
- `blocker.raised` / `blocker.resolved` — the human interrupt (`{ kind: money|design|
  destructive|hard_blocker, question, options? }`). **This is what drives the approval
  cards.**
- `dag.updated` — the dependency map from Phase 1 synthesis (nodes + edges) → powers the
  DAG view and PR-stack view.
- `pr.opened` — `{ number, url, base, head }` (+ stack order).

This is the contract the dashboard renders. Everything else (thoughts, tool calls, shell
output) comes free from hooks and is attached to the nearest semantic event by
`run_id` + `actor` + time.

**Skill edits required (small):**

1. Add `references/observability.md` documenting the event schema + a one-line
   `emit()` convention (append a JSON line to `.swarm/events.jsonl`).
2. In `SKILL.md`, at each phase where the ledger is updated, add "…and emit the
   corresponding event (`references/observability.md`)." Keep it to the state changes
   already tracked — no new bookkeeping burden.
3. Ensure `.swarm/` gitignore already covers `events.jsonl` (it does — whole dir is
   ignored).

## 9. Dashboard UX

Layout: persistent **left rail** (runs list + global status), **top bar** (current run,
phase, elapsed, convergence indicator, cost), **main canvas** (tabbed views), **right
drawer** (contextual detail: agent transcript / diff / evidence). Dark theme default.

### 9.1 Run Overview (landing)
- Phase timeline (0→6) as a horizontal stepper; current phase highlighted, each with
  elapsed time and a count of open items.
- Convergence indicator: are verification + fresh sweep both trending to empty? Flag when
  a fix has flapped near the Phase 5 cap (≈3 cycles) — the "this run is stuck" early
  warning, straight from swarm's own convergence cap.
- Headline counters: agents alive, root causes (confirmed/total), fixes (verified/total),
  open threads, blockers waiting on you.
- The "What I need from you" handoff, rendered live as a checklist as blockers accrue.

### 9.2 Fleet / Swim lanes (the marquee view — G1)
- One lane per agent: the **orchestrator** pinned on top, sub-agents below, grouped by
  phase/role (recon, investigator, verifier, fixer, reviewer, verifier).
- Each lane card shows: role + `subagent_type`, **model** (tier badge — spot an expensive
  model on a mechanical task), live **status** (spawning / thinking / running tool /
  waiting / done / error), **worktree/branch** (for fixers), and a live **"now"** line =
  the latest `afterAgentThought` (what it's thinking) + latest tool action (what it's
  doing).
- Parallel workers (`is_parallel_worker: true`) visually grouped so you see the fan-out.
- Collapsible **hierarchy** (orchestrator → sub-agent) like Claude Code Agent Monitor.
- A thin **live pulse** strip (activity density over time, colored per agent) — the one
  borrowed "ambient" viz that's genuinely useful for spotting a stalled fleet.
- Click a lane → right drawer opens that agent's detail.

### 9.3 Agent detail (right drawer)
- Header: role, type, model, status, task text (`subagentStart.task`), branch,
  message/tool counts (`subagentStop`).
- **Thought/action timeline** for that agent: interleaved thoughts, prompts, tool calls,
  shell commands + output (collapsed, expand on click).
- **Full transcript** link (`agent_transcript_path`) — open the raw sub-agent transcript
  when you want ground truth.
- On stop: the distilled `summary` and `modified_files`.

### 9.4 Findings board (semantic — G2)
- **Root causes** column: each card = hypothesis → `confirmed`/`refuted`, showing the
  investigator's claim and the independent verifier's verdict (and adjudicator if there
  was a third). Evidence path opens the trace in the drawer. This makes swarm's
  "never trust a single source" visible.
- **Fixes** column: each card moves through the state machine (proposed → confirmed →
  in-progress → fixed → reviewed → verified) as a progress rail. Shows worktree/branch,
  commits, and the linked review verdict.
- **Review verdicts**: spec/root-cause PASS/FAIL + quality issues (Critical/Important/
  Minor). When a fix flapped, show the successive reviews so you can see the disagreement.

### 9.5 DAG view (the plan)
- Render the Phase-1 dependency map (`dag.updated`): nodes = problems/fixes, edges =
  ordering constraints. Independent nodes (safe to parallelize) vs. ordered chains.
- Doubles as the **PR-stack preview** in Phase 6: which changes are independent PRs to
  `main` vs. a stacked chain (`branchB → branchA → main`), with the merge order the
  handoff will recommend.

### 9.6 Verification & evidence
- Table of the real checks — build / test / lint / types / task-specific — each with
  status and a link to the **fresh** command output (`afterShellExecution`), because
  swarm requires re-run evidence, not stale logs. Green only when evidence is fresh.
- Sweep results: what the "fresh reconnaissance pass" found each round.

### 9.7 Interrupts & approvals (human-in-the-loop — G4)
- Any `blocker.raised` event becomes a card at the top of the run: the question, the
  context swarm gathered, and the choices.
  - **Money gate** → Approve / Deny (with the cost shown).
  - **Design fork** → the options + a free-text answer box.
  - **Destructive action** → explicit confirm/deny.
  - **Hard blocker** (missing secret/credential) → a "provide it" affordance (written to
    the run's secure input, never logged).
- Answering routes back into the run (§10). The card resolves on `blocker.resolved`.

### 9.8 Prompt console (drive it — G3)
- A launcher: pick repo (from a saved list) + type the goal → starts a headless swarm run.
- Respects the per-repo push rules (warmstack/grant_scraper/lead-scraper → main OK;
  frizzle-fun → PR only) as a preset shown at launch.
- A follow-up box to send messages into the running orchestrator.
- Run controls: **pause / resume / stop** the run.

### 9.9 Cost & tokens (secondary)
- Per-agent and per-run token usage and cost, model breakdown. From SDK `usage` events /
  hook accounting. A panel, never the headline.

### 9.10 Ledger & learnings (raw truth)
- Rendered `.swarm/ledger.md` and `.swarm/learnings.md` for the operator who wants the
  source of truth swarm itself trusts after compaction.

## 10. Control plane — driving swarm from the dashboard

Two mechanisms, chosen per capability:

### 10.1 Launch & steer — Cursor SDK / headless CLI
- **Launch:** the server starts a headless Cursor agent seeded with
  `"Use the swarm skill. Goal: <operator's goal>"` against the chosen repo, via either:
  - **Cursor SDK** (TypeScript `@cursor/sdk` or Python `cursor-sdk`) — preferred:
    `agent.send(...)` returns a `Run`; `run.stream()` yields typed `SDKMessage` events
    (`assistant`, `thinking`, `tool_call`, `status`, `task`, `request`, `usage`). The
    `request` event ("awaiting user input/approval") is the machine-readable interrupt
    signal we bind to approval cards.
  - or **CLI headless:** `cursor-agent -p --output-format stream-json
    --stream-partial-output` → NDJSON of `system`/`assistant`/`tool_call`/`result`.
- **Follow-up / answer:** `run.send(...)` (SDK) or resume the run to push the operator's
  answer into the orchestrator — this is how an interrupt card's answer gets back in.
- **Pause/stop:** SDK run controls / process signal.
- Runs also show up in Cursor's Agents window, so the operator can always jump into Cursor
  to take over — the dashboard doesn't lock them out.

### 10.2 Gate approval — hooks as the enforcement point
- Money/destructive gates are enforced by hooks that **block by default** and consult a
  decision the dashboard supplies:
  - `subagentStart` / `beforeShellExecution` / `beforeMCPExecution` return
    `permission: deny` until the operator approves in the dashboard, then `allow`.
  - Mechanism: the gating hook, on a risky action, writes a pending-decision to the server
    and **waits** (bounded by hook timeout) for the operator's Approve/Deny, then returns
    the corresponding permission. (For actions slower than the hook timeout, swarm's own
    `blocker.raised` path is used instead — surface the card, let swarm pause itself.)
- This gives a real, enforceable "nothing that costs money or is destructive runs without
  my click" guarantee — matching swarm's safety standing orders, now with a UI.

## 11. Tech stack (recommendation)

Bias to the proven local-first stack the field converged on, minimal deps (ponytail):

- **Server:** Bun + TypeScript, SQLite (WAL). HTTP `POST /ingest`, WebSocket `/stream`,
  control routes (`POST /runs`, `POST /runs/:id/answer`, `POST /runs/:id/stop`).
- **Client:** React + Vite + Tailwind (or Vue — either is fine; React chosen for
  familiarity). WebSocket subscription, no polling.
- **Collector hooks:** a single small script (`swarm-emit`, Bun or Python) wired into
  `~/.cursor/hooks.json`, always exits 0, POSTs to the server.
- **Launch integration:** `@cursor/sdk` (TS) in the server process.
- **Packaging:** `npx swarm-dash` (or a `just start`) boots server + client + prints the
  localhost URL. Optional later: Electron/menubar wrapper.

Everything binds to `127.0.0.1`. No external calls. No accounts.

## 12. Privacy, security, safety

- **Local-first, zero telemetry.** All data stays on the machine; server binds to
  localhost; SQLite on disk. No cloud, no signup. (Table-stakes in this field.)
- **Secrets never surface.** The emit/ingest path scrubs `.env*`, keys, tokens; the
  dashboard never renders secret values; hook payloads with secrets are dropped, not
  stored. Inherits swarm's "no secrets in logs/returns" order.
- **Gates are enforced, not cosmetic.** Money/destructive approvals use the hook
  `permission: deny`-by-default mechanism (§10.2) — the UI can't be bypassed into
  spending money.
- **Fail-open observability, fail-closed safety.** Observability hooks always exit 0 (a
  dead dashboard never blocks a run). Safety-gating hooks are `failClosed: true` (a dead
  dashboard blocks the risky action rather than letting it slip).
- **Read-only truth.** Diffs and evidence are shown read-only; the dashboard never edits
  code or force-pushes; merging stays with the human per repo rules.

## 13. Phased rollout

**Milestone 0 — Skill instrumentation (prereq, ~small).**
Add `references/observability.md` + `.swarm/events.jsonl` emission to the swarm skill.
Verifiable without any UI: run swarm, confirm a clean semantic event stream.

**Milestone 1 — MVP (read-only observability).**
Collector (hooks + events.jsonl tail) → Bun/SQLite/WS server → client with **Run
Overview + Fleet swim lanes + Agent detail drawer**. Launch swarm from Cursor as usual;
just watch it. This alone delivers G1 and most of G2 — "see the agents, what they think
and do."

**Milestone 2 — Semantic + evidence.**
Findings board, verification/evidence panel, DAG view, ledger view. Full G2 + G6.

**Milestone 3 — Drive it (control plane).**
Prompt console (launch via SDK), follow-ups, pause/stop, and the interrupts/approvals
cards with answers routed back. Delivers G3 + G4 — the dashboard becomes the cockpit.

**Milestone 4 — Polish.**
Cost panel, live pulse, filters/search, cloud-run support (repo-committed hooks),
menubar/Electron wrapper, multi-run history.

## 14. Success metrics

- **Time-to-situational-awareness:** < 5s from opening the dashboard to knowing phase,
  live agents, and whether anything is blocked. (Today: unbounded — you scroll chat.)
- **Cursor-free operation:** a full run — launch → answer 1 blocker → land the PR — done
  without opening Cursor chat.
- **Zero run impact:** measured overhead from hooks/collector is negligible; a dead
  dashboard never stalls or breaks a run.
- **Signal-to-noise:** the default view surfaces domain state; the raw tool firehose is
  one click away, never the front page. (Qualitative: "no slop" gut check.)

## 15. Open questions / risks

- **Hook coverage of nested sub-agents.** Confirm `subagentStart/Stop` fire for agents
  spawned by sub-agents (swarm mostly spawns one level from the orchestrator, but recon
  synthesis etc. could nest). If not, lean harder on the semantic `dispatch.sent` events.
- **Correlating hook events to semantic refs.** `subagentStart.task` text + `git_branch`
  is the join key to a swarm `dispatch.sent`/`fix.*` event. Need a stable convention
  (e.g., the orchestrator includes the `ref` in the dispatch task text) so lanes map
  cleanly to findings. Cheap to add in §8.
- **Gate-via-hook timeout.** Hook wait is bounded; long human deliberation must fall back
  to swarm's own `blocker.raised`/pause path rather than a hanging hook. Decide the
  threshold.
- **SDK vs CLI for launch.** SDK gives typed events + `request`/follow-up ergonomics;
  confirm it's stable enough (public beta as of mid-2026) or start with CLI NDJSON.
- **Multiple concurrent runs / repos.** MVP assumes one active run; design the data model
  with `run_id` from day one so multi-run is additive.
- **Skill-change buy-in.** The semantic layer (§8) is the one thing that requires editing
  the skill. It's small and ledger-aligned, but it is the critical dependency — the
  dashboard is only "not slop" because of it.

## 16. Anti-slop principles (the standing bar)

1. **Every panel answers a question the operator actually asks mid-run.** If we can't name
   the question, cut the panel.
2. **Domain model first, firehose last.** Semantic state is the front page; raw tool
   events are a drill-in.
3. **Reflect verified reality.** Show git diff, fresh command output, and the ledger —
   never an agent's unverified status line. (Swarm's own ethos.)
4. **Never impede the run.** Observability fails open; the dashboard is a lens, not a
   dependency.
5. **No decoration masquerading as function.** No buddy, no badges, no vanity charts.
6. **Local, private, yours.** No cloud, no signup, no telemetry.
```
