# SureAgents for Amp

This is a native Amp plugin for the manual SureAgents workflows:

- `SureAgents: Review changes`
- `SureAgents: Review changes or PR` (leave blank for local changes)
- `SureAgents: Annotate file`
- `SureAgents: Annotate last answer`

Amp commands live in the command palette, not as slash commands. This plugin does
not intercept Amp's planning flow.

## Install

Install the `sureagents` CLI first:

```bash
curl -fsSL https://sureagents.ai/install.sh | bash
```

Then install the Amp plugin:

```bash
mkdir -p ~/.config/amp/plugins
curl -fsSL https://raw.githubusercontent.com/suryansh1914/sureagents/main/apps/amp-plugin/sureagents.ts \
  -o ~/.config/amp/plugins/sureagents.ts
```

Restart Amp or run `plugins: reload` from the command palette.

For project-local installation, copy the plugin to:

```text
.amp/plugins/sureagents.ts
```

## Local Development

From a SureAgents checkout:

```bash
mkdir -p .amp/plugins
ln -sf ../../apps/amp-plugin/sureagents.ts .amp/plugins/sureagents.ts
export SUREAGENTS_AMP_USE_SOURCE=1
export SUREAGENTS_CWD="$PWD"
```

Run `plugins: reload` in Amp. When the plugin is loaded from this repository, it
runs the checkout's source entrypoint instead of a global `sureagents` binary.
You can also point directly at a source entry:

```bash
export SUREAGENTS_AMP_SOURCE_ENTRY=/path/to/sureagents/apps/hook/server/index.ts
```
