#!/usr/bin/env node

const { emitAnnotateDecision, exitWithFailure, runSureAgents } = require("../lib/run-sureagents");

const result = runSureAgents(["annotate-last", ...process.argv.slice(2), "--json"]);

if (result.error || result.status !== 0) {
  exitWithFailure(result, "sureagents annotate-last");
}

emitAnnotateDecision(result.stdout, "Message Annotations");
