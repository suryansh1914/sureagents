---
title: "Kiro CLI"
description: "SureAgents skills and a custom-agent example for Kiro CLI."
sidebar:
  order: 16
section: "Guides"
---

SureAgents supports Kiro CLI through installable skills plus an example custom agent. Skills are
invoked on demand — there are no background hooks, matching how SureAgents integrates with Droid
and Copilot CLI.

## Setup

Kiro is auto-detected. If `~/.kiro` exists (or `kiro-cli` is on your PATH) when you run the
installer, the Kiro skills install automatically — the same convention used for Codex and Gemini.
No extra flags or steps. Auto-detection works on every platform; use the installer for your OS:

**macOS / Linux / WSL:**

```bash
curl -fsSL https://sureagents.ai/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://sureagents.ai/install.ps1 | iex
```

**Windows CMD:**

```cmd
curl -fsSL https://sureagents.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

This installs the Kiro skills to `~/.kiro/skills` and the SureAgents agent to
`~/.kiro/agents/sureagents.json`. If you install Kiro *after* SureAgents, just re-run the installer.
See [Use the SureAgents agent](#use-the-sureagents-agent) below.

## Installed Kiro skills

Kiro-specific skills (run with `SUREAGENTS_ORIGIN=kiro-cli`):

- `sureagents-review`
- `sureagents-annotate`

Shared extra skills (installed from SureAgents's canonical `apps/skills/extra/` set, not duplicated):

- `sureagents-setup-goal`
- `sureagents-visual-explainer`

The shared skills show the default agent badge rather than "Kiro CLI" — origin is cosmetic for
Kiro and has no functional effect.

## Use the SureAgents agent

The installer writes the agent to `~/.kiro/agents/sureagents.json`. It wires every SureAgents skill
through the `resources` field (`skill://` URIs), grants the `shell` tool scoped to `sureagents`
commands, and its prompt spells out which skill to use for which task:

| Skill | Use it to |
|-------|-----------|
| `sureagents-review` | Review the current code changes or a pull request |
| `sureagents-annotate` | Annotate a markdown/HTML file, folder, or URL |
| `sureagents-setup-goal` | Turn an idea into a structured goal package |
| `sureagents-visual-explainer` | Generate a polished visual HTML explainer |

Launch it:

```bash
kiro-cli chat --agent sureagents
```

Prefer your own agent? Add the same `skill://~/.kiro/skills/sureagents-*/SKILL.md` resources to any
custom agent's `resources` list.

## Assumptions

The custom-agent JSON is intentionally conservative because Kiro's schema can evolve. If your Kiro
version expects different field names for resources or tool permissions, edit
`~/.kiro/agents/sureagents.json` for your runtime.
