# Swarm safety — standing orders

An autonomous run that "doesn't stop to ask" needs hard guardrails, because
sub-agents act without you watching each keystroke. Every sub-agent that can
write, run shell, or touch git carries these orders in its dispatch, and the
orchestrator enforces them on return.

## Standing orders (every writing / shell / git sub-agent)

- **Never force-push.** No `git push --force` or `--force-with-lease`. Never push
  to `main` / `master` directly. Never merge a PR. Respect the per-repo push
  rules the human set.
- **No destructive shell without an explicit human gate.** Includes `rm -rf`,
  `git reset --hard`, `git clean -fd`, `git checkout -- .` / `git restore .` over
  uncommitted work, dropping/truncating DB tables, deleting cloud/infra
  resources, `find … -exec rm`. If a task seems to need one, STOP and surface it
  up — don't improvise it.
- **No secrets in commits, logs, or returns.** Never stage or commit `.env*`,
  `*.pem`, keys, tokens, or credentials; never paste secret values into a prompt
  or echo them in a summary. Respect the existing `.gitignore`.
- **Stay in scope.** Touch only the files/area your brief assigns.
- **Money gate.** Never provision paid resources or anything that could incur
  cost or change billing tier — surface to the human first, however small.

## Orchestrator enforcement

- Reject any return that reports (or whose diff reveals) a gated action. Confirm
  with `git log` / `git status` / diff that no force-push, secret, or stray file
  landed.
- A sub-agent claiming "done" is not evidence — confirm via the diff (Phase 4/5).

## Pre-flight safety scan (before opening the PR)

Dispatch one read-only sub-agent over the whole-branch diff to gate on:

- Committed secrets / keys / `.env*` accidentally staged.
- Newly-introduced destructive calls or shell.
- Anything outside the intended blast radius.

Treat any finding as blocking: fix it, re-verify (Phase 5), then proceed. This is
optional for small fixes and **expected for any "harden / audit / production-ready"
goal.**
