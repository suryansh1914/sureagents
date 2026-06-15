---
title: "Configuration"
description: "Environment variables, hooks configuration, and runtime options for SureAgents."
sidebar:
  order: 3
section: "Getting Started"
---

SureAgents is configured through environment variables, hook/plugin configuration files, and an optional `~/.sureagents/config.json` file for persistent settings and feature-specific overrides.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUREAGENTS_REMOTE` | auto-detect | Set to `1` or `true` to force remote mode, `0` or `false` to force local mode, or leave unset to auto-detect via `SSH_TTY` / `SSH_CONNECTION`. Uses a fixed port in remote mode; browser-opening behavior depends on the environment. |
| `SUREAGENTS_PORT` | random (local) / `19432` (remote) | Fixed server port. Useful for port forwarding in remote environments. |
| `SUREAGENTS_BROWSER` | system default | Custom browser or script to open the UI. |
| `SUREAGENTS_SHARE` | enabled | Set to `disabled` to turn off URL sharing entirely. |
| `SUREAGENTS_SHARE_URL` | `https://share.sureagents.ai` | Point share links at a self-hosted portal. |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Respected by the install script when placing hooks. |

See the [environment variables reference](/docs/reference/environment-variables/) for full details, port resolution order, and examples.

## Hook configuration (Claude Code)

The hook is defined in `hooks.json` inside the plugin directory. When installed via the marketplace, this is managed automatically. For manual installation, add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "sureagents",
            "timeout": 345600
          }
        ]
      }
    ]
  }
}
```

The `matcher` targets the `ExitPlanMode` tool specifically. The `timeout` is in seconds (`345600` = 96 hours) — long reviews can stay open without expiring.

## Plugin configuration (OpenCode)

OpenCode uses `opencode.json` to load the plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@sureagents/opencode@latest"]
}
```

This uses the default `plan-agent` workflow: `submit_plan` is registered for OpenCode's `plan` agent, while `build` and other primary agents do not see it.

To configure the workflow explicitly:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@sureagents/opencode@latest", {
      "workflow": "plan-agent",
      "planningAgents": ["plan"]
    }]
  ]
}
```

When SureAgents is used with other OpenCode plugins, the options object must stay attached to the SureAgents plugin entry:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@sureagents/opencode@latest", {
      "workflow": "plan-agent",
      "planningAgents": ["plan", "sisyphus"]
    }],
    "oh-my-opencode-slim",
    "openviking-opencode"
  ]
}
```

Use `workflow: "manual"` for commands-only mode, or `workflow: "all-agents"` to restore the legacy behavior where primary agents can call `submit_plan`. In `plan-agent` mode, any names listed in `planningAgents` are added alongside OpenCode's built-in `plan` agent. Slash commands (`/sureagents-review`, `/sureagents-annotate`, `/sureagents-last`) require the CLI to be installed separately via the install script.

If you are upgrading from an older OpenCode install, see the [OpenCode 0.19.1 migration guide](/docs/guides/opencode-migration-0-19-1/).

## Plan saving

Approved and denied plans are saved to `~/.sureagents/plans/` by default. You can change the save directory or disable saving in the SureAgents UI settings (gear icon).

## Config file

SureAgents reads `~/.sureagents/config.json` for persistent settings. This includes display name, diff options, conventional comment labels, and feedback message customization.

You can customize the messages SureAgents sends to the agent when you approve, deny, or annotate plans and documents. See the [custom feedback guide](/docs/guides/custom-feedback/) for the full config shape, template variables, and runtime-specific overrides.

## Remote mode

When working over SSH, in a devcontainer, or in Docker, set `SUREAGENTS_REMOTE=1` (or `true`) and `SUREAGENTS_PORT` to a port you'll forward. Set `SUREAGENTS_REMOTE=0` / `false` if you need to force local behavior even when SSH env vars are present. See the [remote & devcontainers guide](/docs/guides/remote-and-devcontainers/) for setup instructions.

## Custom browser

`SUREAGENTS_BROWSER` accepts an app name (macOS), executable path (Linux/Windows), or a custom script. This is useful for opening SureAgents in a specific browser or handling URL opening in unusual environments.

```bash
# macOS
export SUREAGENTS_BROWSER="Google Chrome"

# Linux
export SUREAGENTS_BROWSER="/usr/bin/firefox"

# Custom script
export SUREAGENTS_BROWSER="/path/to/my-open-script.sh"
```

For one-off overrides without changing your shell profile, use the `--browser` flag:

```bash
sureagents review --browser "Safari"
sureagents annotate plan.md --browser "Firefox"
```

## Session discovery

If you accidentally close a SureAgents browser tab, the server is still running — you just need the URL. The `sessions` subcommand lists active sessions and can reopen them:

```bash
sureagents sessions              # list active sessions
sureagents sessions --open       # reopen most recent session
sureagents sessions --open 2     # reopen a specific session
sureagents sessions --clean      # remove stale session files
```

Sessions are tracked automatically. Stale entries from crashed processes are cleaned up on the next listing.

## Disabling sharing

Set `SUREAGENTS_SHARE=disabled` to remove all sharing UI — the Share tab, copy link action, and import review option are all hidden. Useful for teams working with sensitive plans.

To self-host the share portal instead, see the [self-hosting guide](/docs/guides/self-hosting/).
