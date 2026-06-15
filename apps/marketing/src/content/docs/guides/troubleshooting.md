---
title: "Troubleshooting"
description: "Common issues and how to resolve them."
sidebar:
  order: 24
section: "Guides"
---

## Lost a SureAgents tab?

If you accidentally close a SureAgents browser tab, the server is still running in the background. You can find and reopen it:

```bash
sureagents sessions
```

This lists all active sessions with their mode, project, URL, and how long they've been running:

```
Active SureAgents sessions:

  #1  review    my-project           http://localhost:54321    3m ago
  #2  plan      my-project           http://localhost:12345    15m ago

Reopen with: sureagents sessions --open [N]
```

To reopen one:

```bash
sureagents sessions --open       # reopens the most recent
sureagents sessions --open 2     # reopens session #2
```

Stale sessions from crashed processes are cleaned up automatically. You can also force cleanup with `sureagents sessions --clean`.

## Where does SureAgents store data?

All local data lives under `~/.sureagents/`:

| Directory | What's in it |
|-----------|-------------|
| `plans/` | Snapshots of approved and denied plans. Controlled by the "Save plans" toggle in Settings. |
| `history/` | Automatic version history for every plan, organized by project and heading. Powers the plan diff and version browser. |
| `drafts/` | Auto-saved annotation drafts. If a server crashes mid-review, your in-progress annotations are recovered on the next session. |
| `sessions/` | Temporary session files for active servers. Cleaned up automatically when a server exits. |

Plan saving is enabled by default. You can change the save directory or disable it entirely in the SureAgents UI settings (gear icon).

## Browser doesn't open

If the UI doesn't open automatically, check:

- **Remote/SSH session?** Set `SUREAGENTS_REMOTE=1` and `SUREAGENTS_PORT` to a port you'll forward. See the [remote guide](/docs/guides/remote-and-devcontainers/).
- **Wrong browser?** Set `SUREAGENTS_BROWSER` to the app name or path, or use `--browser` for a one-off override.
- **URL still works** — even if the browser didn't open, the server is running. Check `sureagents sessions` for the URL and open it manually.

## Hook doesn't fire

If `ExitPlanMode` doesn't trigger SureAgents:

1. Make sure the plugin is installed: `/plugin install sureagents@sureagents`
2. Restart Claude Code after installing (hooks load on startup)
3. Verify `sureagents` is on your PATH: `which sureagents`
4. Check that plan mode is enabled in your Claude Code session

## Codex plan review doesn't open

Codex plan review uses the experimental `Stop` hook, which the macOS, Linux, and WSL installer configures automatically when Codex is installed or `~/.codex` already exists.

If a Codex plan turn completes without opening SureAgents:

1. Rerun the installer: `curl -fsSL https://sureagents.ai/install.sh | bash`
2. Restart Codex Desktop or CLI so hooks are reloaded
3. Check `~/.codex/config.toml` contains `hooks = true` under `[features]`
4. Check `~/.codex/hooks.json` has a `Stop` hook whose command points to `sureagents`
5. Run `sureagents sessions` in case the browser failed to open but the session is running

Codex hooks are currently disabled on Windows in the official Codex docs, so the Windows installer prints manual guidance instead of changing Codex config automatically.

## OpenCode build agent cannot call `submit_plan`

This is expected with the default OpenCode workflow. SureAgents now defaults to `plan-agent`, which keeps `submit_plan` available to OpenCode's `plan` agent and hides or denies it for `build` and other non-planning primary agents.

If you want the old broad behavior, opt in from `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@sureagents/opencode@latest", {
      "workflow": "all-agents"
    }]
  ]
}
```

If you do not want automatic plan review at all, use `workflow: "manual"` and run `/sureagents-last` or `/sureagents-annotate` when you want SureAgents.
