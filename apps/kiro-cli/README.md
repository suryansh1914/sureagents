# SureAgents Kiro CLI Integration

Source package for SureAgents's Kiro CLI support. These files are consumed by the main installer
(`scripts/install.sh`) — there is **no separate Kiro installer**. A Kiro user installs with the same
one-liner as everyone else.

## Contents

- `skills/` — Kiro-specific skill packages (`sureagents-review`, `sureagents-annotate`),
  each baking `SUREAGENTS_ORIGIN=kiro-cli` into its command.
  <!-- NOTE: The canonical, single-sourced core skills live in `apps/skills/core/`. These Kiro
       copies are intentionally independent (they hardcode SUREAGENTS_ORIGIN=kiro-cli) and are
       exempt from single-sourcing — do not replace them with the core copies. -->

- `agents/sureagents.json` — an example Kiro custom agent that exposes the SureAgents skills via
  `skill://` resources and a `sureagents`-scoped `shell` tool.

## How it installs

`scripts/install.sh` auto-detects Kiro (if `~/.kiro` exists or `kiro-cli` is on PATH — the same
convention used for Codex and Gemini) and installs:

- the 2 Kiro-specific skills above → `~/.kiro/skills`
- the 2 shared skills `sureagents-setup-goal` and `sureagents-visual-explainer` (pulled from
  `apps/skills/extra/`, not duplicated here) → `~/.kiro/skills`
- the example agent `agents/sureagents.json` → `~/.kiro/agents/sureagents.json` (an existing file
  is never overwritten)

```bash
curl -fsSL https://sureagents.ai/install.sh | bash
```

## Use the SureAgents agent

The installed agent wires all four skills via `skill://` resources and, in its prompt, documents
which skill to use for which task (review, annotate, setup-goal, visual-explainer). Launch
it:

```bash
kiro-cli chat --agent sureagents
```

Or add the same `skill://~/.kiro/skills/sureagents-*/SKILL.md` resources to one of your own agents.

## Schema note

`agents/sureagents.json` is a conservative example. If Kiro changes its custom-agent schema, adapt
the installed copy at `~/.kiro/agents/sureagents.json`.
