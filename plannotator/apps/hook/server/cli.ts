export function isTopLevelHelpInvocation(args: string[]): boolean {
  return args[0] === "--help";
}

export function isVersionInvocation(args: string[]): boolean {
  return args[0] === "--version" || args[0] === "-v";
}

declare const __CLI_VERSION__: string;

export function formatVersion(): string {
  return `sureagents ${typeof __CLI_VERSION__ !== "undefined" ? __CLI_VERSION__ : "dev"}`;
}

export function isInteractiveNoArgInvocation(
  args: string[],
  stdinIsTTY: boolean | undefined,
): boolean {
  return args.length === 0 && stdinIsTTY === true;
}

export function formatTopLevelHelp(): string {
  return [
    "Usage:",
    "  sureagents --help",
    "  sureagents --version, -v",
    "  sureagents [--browser <name>]",
    "  sureagents review [--git] [PR_URL]",
    "  sureagents annotate <file.md | file.html | https://... | folder/>  [--no-jina] [--gate] [--json] [--hook]",
    "  sureagents annotate-last [--stdin] [--gate] [--json] [--hook]",
    "  sureagents setup-goal <interview|facts> <bundle.json | -> [--json]",
    "  sureagents last",
    "  sureagents archive",
    "  sureagents sessions",
    "  sureagents improve-context",
    "",
    "Note:",
    "  running 'sureagents' without arguments is for hook integration and expects JSON on stdin",
  ].join("\n");
}

export function formatInteractiveNoArgClarification(): string {
  return [
    "sureagents (without arguments) is usually launched automatically by Claude Code hooks.",
    "It expects hook JSON on stdin.",
    "",
    "For interactive use, try:",
    "  sureagents review",
    "  sureagents annotate <file.md | file.html | https://...>",
    "  sureagents setup-goal interview bundle.json --json",
    "  sureagents last",
    "  sureagents archive",
    "  sureagents sessions",
    "",
    "Run 'sureagents --help' for top-level usage.",
  ].join("\n");
}
