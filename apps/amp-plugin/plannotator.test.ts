import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildEnv,
  buildSureAgentsEnv,
  extractTextFromThreadMessage,
  findFirstPositionalArg,
  formatAnnotationFeedback,
  getSureAgentsDataDir,
  getSureAgentsCommandCandidates,
  isNoActionFeedback,
  parseAnnotateDecision,
  parseReviewTargetInput,
  resolveAmpWorkspaceRoot,
  resolveCwd,
  splitCommandArgs,
} from "./sureagents";

describe("Amp SureAgents plugin helpers", () => {
  test("extracts visible assistant text blocks", () => {
    const text = extractTextFromThreadMessage({
      role: "assistant",
      id: "m-1",
      content: [
        { type: "thinking", thinking: "hidden reasoning" },
        { type: "text", text: "First paragraph." },
        { type: "tool_use", id: "tool-1", name: "bash", input: {} },
        { type: "text", text: "Second paragraph." },
      ],
    });

    expect(text).toBe("First paragraph.\n\nSecond paragraph.");
  });

  test("parses structured annotate decisions", () => {
    expect(parseAnnotateDecision('{"decision":"approved"}')).toEqual({ decision: "approved" });
    expect(parseAnnotateDecision("")).toEqual({ decision: "dismissed" });
    expect(parseAnnotateDecision("plain feedback")).toBeNull();
  });

  test("wraps actionable annotation feedback for Amp thread append", () => {
    expect(
      formatAnnotationFeedback(
        { decision: "annotated", feedback: "Comment: tighten this section." },
        { kind: "message" },
      ),
    ).toBe(
      "# Message Annotations\n\nComment: tighten this section.\n\nPlease address the annotation feedback above.",
    );
  });

  test("wraps file annotation feedback with target path", () => {
    expect(
      formatAnnotationFeedback(
        { decision: "annotated", feedback: "Comment: tighten this section." },
        { kind: "file", filePath: "docs/plan.md" },
      ),
    ).toBe(
      "# Markdown Annotations\n\nFile: docs/plan.md\n\nComment: tighten this section.\n\nPlease address the annotation feedback above.",
    );
  });

  test("detects non-action outputs", () => {
    expect(isNoActionFeedback("Review session closed without feedback.")).toBe(true);
    expect(isNoActionFeedback("Code review completed — no changes requested.")).toBe(false);
    expect(isNoActionFeedback("Please fix this bug.")).toBe(false);
  });

  test("splits review target arguments without invoking a shell", () => {
    expect(splitCommandArgs("--git https://github.com/org/repo/pull/1")).toEqual([
      "--git",
      "https://github.com/org/repo/pull/1",
    ]);
    expect(splitCommandArgs('"https://example.com/a path"')).toEqual([
      "https://example.com/a path",
    ]);
    expect(splitCommandArgs(String.raw`docs/My\ File.md --gate`)).toEqual([
      "docs/My File.md",
      "--gate",
    ]);
    expect(splitCommandArgs(String.raw`C:\Users\alice\plan.md`)).toEqual([
      String.raw`C:\Users\alice\plan.md`,
    ]);
    expect(splitCommandArgs(String.raw`"C:\Users\alice\My Plan.md"`)).toEqual([
      String.raw`C:\Users\alice\My Plan.md`,
    ]);
  });

  test("finds annotate target after flags", () => {
    expect(findFirstPositionalArg(["--no-jina", "https://example.com"])).toBe("https://example.com");
    expect(findFirstPositionalArg(["--browser", "Google Chrome", "docs/plan.md"])).toBe("docs/plan.md");
  });

  test("distinguishes canceled review target prompts from blank local reviews", () => {
    expect(parseReviewTargetInput(undefined)).toBeNull();
    expect(parseReviewTargetInput("   ")).toEqual([]);
    expect(parseReviewTargetInput("--git https://github.com/org/repo/pull/1")).toEqual([
      "--git",
      "https://github.com/org/repo/pull/1",
    ]);
  });

  test("prefers Amp command cwd over process PWD", async () => {
    const processPwd = mkdtempSync(join(tmpdir(), "sureagents-amp-process-"));
    const commandCwd = mkdtempSync(join(tmpdir(), "sureagents-amp-command-"));
    const originalPwd = process.env.PWD;
    const originalOverride = process.env.SUREAGENTS_CWD;
    const originalLogFile = process.env.AMP_LOG_FILE;

    try {
      process.env.PWD = processPwd;
      delete process.env.SUREAGENTS_CWD;
      process.env.AMP_LOG_FILE = join(processPwd, "missing-amp.log");

      const cwd = await resolveCwd(commandContextWithCwd(commandCwd));

      expect(cwd).toBe(commandCwd);
    } finally {
      restoreEnv("PWD", originalPwd);
      restoreEnv("SUREAGENTS_CWD", originalOverride);
      restoreEnv("AMP_LOG_FILE", originalLogFile);
      rmSync(processPwd, { recursive: true, force: true });
      rmSync(commandCwd, { recursive: true, force: true });
    }
  });

  test("resolves Amp workspace root from the parent CLI log", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "sureagents-amp-log-"));
    const oldWorkspace = mkdtempSync(join(tempDir, "old-workspace-"));
    const currentWorkspace = mkdtempSync(join(tempDir, "current-workspace-"));
    const logPath = join(tempDir, "cli.log");

    try {
      writeFileSync(
        logPath,
        [
          JSON.stringify({
            pid: 123,
            workspaceRoot: pathToFileURL(oldWorkspace).href,
          }),
          JSON.stringify({
            pid: 456,
            workspaceRoot: pathToFileURL(currentWorkspace).href,
          }),
        ].join("\n"),
        "utf8",
      );

      expect(resolveAmpWorkspaceRoot({ logPath, parentPid: 456 })).toBe(currentWorkspace);
      expect(resolveAmpWorkspaceRoot({ logPath, parentPid: 999 })).toBe(currentWorkspace);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("uses Amp workspace log before plugin runtime cwd", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "sureagents-amp-cwd-"));
    const workspace = mkdtempSync(join(tempDir, "workspace-"));
    const pluginCwd = mkdtempSync(join(tempDir, "plugins-"));
    const logPath = join(tempDir, "cli.log");
    const originalLogFile = process.env.AMP_LOG_FILE;
    const originalOverride = process.env.SUREAGENTS_CWD;

    try {
      process.env.AMP_LOG_FILE = logPath;
      delete process.env.SUREAGENTS_CWD;
      writeFileSync(
        logPath,
        JSON.stringify({
          pid: process.ppid,
          workspaceRoot: pathToFileURL(workspace).href,
        }),
        "utf8",
      );

      const cwd = await resolveCwd(commandContextWithCwd(pluginCwd));

      expect(cwd).toBe(workspace);
    } finally {
      restoreEnv("AMP_LOG_FILE", originalLogFile);
      restoreEnv("SUREAGENTS_CWD", originalOverride);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("lets SUREAGENTS_CWD override Amp command cwd", async () => {
    const explicitCwd = mkdtempSync(join(tmpdir(), "sureagents-amp-explicit-"));
    const commandCwd = mkdtempSync(join(tmpdir(), "sureagents-amp-command-"));
    const originalOverride = process.env.SUREAGENTS_CWD;

    try {
      process.env.SUREAGENTS_CWD = explicitCwd;

      const cwd = await resolveCwd(commandContextWithCwd(commandCwd));

      expect(cwd).toBe(explicitCwd);
    } finally {
      restoreEnv("SUREAGENTS_CWD", originalOverride);
      rmSync(explicitCwd, { recursive: true, force: true });
      rmSync(commandCwd, { recursive: true, force: true });
    }
  });

  test("ready-file mode preserves SureAgents browser opening", () => {
    expect(buildSureAgentsEnv("/repo", "/tmp/ready.jsonl")).toEqual({
      SUREAGENTS_ORIGIN: "amp",
      SUREAGENTS_CWD: "/repo",
      SUREAGENTS_READY_FILE: "/tmp/ready.jsonl",
    });
  });

  test("does not let Amp's Bun mode leak into the SureAgents binary", () => {
    const originalBeBun = process.env.BUN_BE_BUN;

    try {
      process.env.BUN_BE_BUN = "1";
      expect(buildEnv({ SUREAGENTS_ORIGIN: "amp" }).BUN_BE_BUN).toBeUndefined();
    } finally {
      restoreEnv("BUN_BE_BUN", originalBeBun);
    }
  });

  test("matches shared SureAgents data directory semantics", () => {
    const originalDataDir = process.env.SUREAGENTS_DATA_DIR;

    try {
      process.env.SUREAGENTS_DATA_DIR = String.raw`~\sureagents-data`;
      expect(getSureAgentsDataDir()).toBe(join(homedir(), "sureagents-data"));

      process.env.SUREAGENTS_DATA_DIR = "relative-sureagents-data";
      expect(getSureAgentsDataDir()).toBe(resolve("relative-sureagents-data"));
    } finally {
      restoreEnv("SUREAGENTS_DATA_DIR", originalDataDir);
    }
  });

  test("prefers installer binary paths before PATH lookup", () => {
    expect(
      getSureAgentsCommandCandidates({
        home: "/Users/alice",
        pluginDir: "/Users/alice/.config/amp/plugins",
        platform: "darwin",
        env: {},
      }),
    ).toEqual([
      ["/Users/alice/.local/bin/sureagents"],
      ["sureagents"],
    ]);

    expect(
      getSureAgentsCommandCandidates({
        home: String.raw`C:\Users\alice`,
        pluginDir: String.raw`C:\Users\alice\.config\amp\plugins`,
        platform: "win32",
        env: {
          LOCALAPPDATA: String.raw`C:\Users\alice\AppData\Local`,
          USERPROFILE: String.raw`C:\Users\alice`,
        },
      }),
    ).toEqual([
      [String.raw`C:\Users\alice\AppData\Local/sureagents/sureagents.exe`],
      [String.raw`C:\Users\alice/.local/bin/sureagents.exe`],
      ["sureagents"],
    ]);
  });

  test("allows explicit SUREAGENTS_BIN override", () => {
    expect(
      getSureAgentsCommandCandidates({
        home: "/Users/alice",
        pluginDir: "/Users/alice/.config/amp/plugins",
        platform: "darwin",
        env: { SUREAGENTS_BIN: "/opt/sureagents/bin/sureagents" },
      }),
    ).toEqual([
      ["/opt/sureagents/bin/sureagents"],
      ["/Users/alice/.local/bin/sureagents"],
      ["sureagents"],
    ]);
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function commandContextWithCwd(cwd: string): Parameters<typeof resolveCwd>[0] {
  return {
    $: async () => ({ exitCode: 0, stdout: `${cwd}\n`, stderr: "" }),
  } as Parameters<typeof resolveCwd>[0];
}
