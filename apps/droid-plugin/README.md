# SureAgents for Droid

SureAgents's Droid plugin ships the manual slash-command workflow only:

- `/sureagents-review [PR_URL]` (no args reviews local changes)
- `/sureagents-annotate <file|folder|url>`
- `/sureagents-last`

It does not attempt plan-mode interception or host-level planning integration.

## Install

Install the `sureagents` CLI first:

```bash
curl -fsSL https://sureagents.ai/install.sh | bash
```

Then add the marketplace and install the plugin:

```bash
droid plugin marketplace add https://github.com/suryansh1914/sureagents
droid plugin install sureagents@sureagents
```

For local development:

```bash
cd /path/to/sureagents
droid plugin marketplace add "$PWD"
droid plugin install sureagents@sureagents
```

## Notes

- The plugin expects `sureagents` on `PATH`.
- Review and annotate flows still open the SureAgents browser UI and return the result to the Droid session.
- The command wrappers set `SUREAGENTS_ORIGIN=droid` so the UI can label the host correctly.
