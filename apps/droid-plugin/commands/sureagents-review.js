#!/usr/bin/env node

const { exitWithFailure, runSureAgents } = require("../lib/run-sureagents");

const result = runSureAgents(["review", ...process.argv.slice(2)]);

if (result.error || result.status !== 0) {
  exitWithFailure(result, "sureagents review");
}

const output = result.stdout.trim();
process.stdout.write(output ? `${output}\n` : "Review session closed without feedback.\n");
