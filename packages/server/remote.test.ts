/**
 * Remote Detection & Port Config Tests
 *
 * Run: bun test packages/server/remote.test.ts
 */

import { afterEach, describe, expect, test } from "bun:test";
import { isRemoteSession, getServerHostname, getServerPort } from "./remote";

// Save and restore env between tests
const savedEnv: Record<string, string | undefined> = {};
const envKeys = ["SUREAGENTS_REMOTE", "SUREAGENTS_PORT", "SSH_TTY", "SSH_CONNECTION"];

function clearEnv() {
  for (const key of envKeys) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

afterEach(() => {
  for (const key of envKeys) {
    if (savedEnv[key] !== undefined) {
      process.env[key] = savedEnv[key];
    } else {
      delete process.env[key];
    }
  }
});

describe("isRemoteSession", () => {
  test("false by default (no env vars)", () => {
    clearEnv();
    expect(isRemoteSession()).toBe(false);
  });

  test("true when SUREAGENTS_REMOTE=1", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "1";
    expect(isRemoteSession()).toBe(true);
  });

  test("true when SUREAGENTS_REMOTE=true", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "true";
    expect(isRemoteSession()).toBe(true);
  });

  test("false when SUREAGENTS_REMOTE=0", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "0";
    expect(isRemoteSession()).toBe(false);
  });

  test("false when SUREAGENTS_REMOTE=false", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "false";
    expect(isRemoteSession()).toBe(false);
  });

  test("SUREAGENTS_REMOTE=false overrides SSH_TTY", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "false";
    process.env.SSH_TTY = "/dev/pts/0";
    expect(isRemoteSession()).toBe(false);
  });

  test("SUREAGENTS_REMOTE=0 overrides SSH_CONNECTION", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "0";
    process.env.SSH_CONNECTION = "192.168.1.1 12345 192.168.1.2 22";
    expect(isRemoteSession()).toBe(false);
  });

  test("true when SSH_TTY is set (legacy)", () => {
    clearEnv();
    process.env.SSH_TTY = "/dev/pts/0";
    expect(isRemoteSession()).toBe(true);
  });

  test("true when SSH_CONNECTION is set (legacy)", () => {
    clearEnv();
    process.env.SSH_CONNECTION = "192.168.1.1 12345 192.168.1.2 22";
    expect(isRemoteSession()).toBe(true);
  });
});

describe("getServerPort", () => {
  test("returns 0 for local session (random port)", () => {
    clearEnv();
    expect(getServerPort()).toBe(0);
  });

  test("returns 19432 for remote session", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "1";
    expect(getServerPort()).toBe(19432);
  });

  test("returns 0 when SUREAGENTS_REMOTE=false overrides SSH", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "false";
    process.env.SSH_TTY = "/dev/pts/0";
    expect(getServerPort()).toBe(0);
  });

  test("explicit SUREAGENTS_PORT overrides everything", () => {
    clearEnv();
    process.env.SUREAGENTS_PORT = "8080";
    expect(getServerPort()).toBe(8080);
  });

  test("explicit port overrides remote default", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "1";
    process.env.SUREAGENTS_PORT = "3000";
    expect(getServerPort()).toBe(3000);
  });

  test("ignores invalid port (falls back to default)", () => {
    clearEnv();
    process.env.SUREAGENTS_PORT = "not-a-number";
    expect(getServerPort()).toBe(0);
  });

  test("ignores out-of-range port", () => {
    clearEnv();
    process.env.SUREAGENTS_PORT = "99999";
    expect(getServerPort()).toBe(0);
  });

  test("ignores zero port", () => {
    clearEnv();
    process.env.SUREAGENTS_PORT = "0";
    expect(getServerPort()).toBe(0);
  });
});

describe("getServerHostname", () => {
  test("returns loopback for local sessions", () => {
    clearEnv();
    expect(getServerHostname()).toBe("127.0.0.1");
  });

  test("returns all interfaces for remote sessions", () => {
    clearEnv();
    process.env.SUREAGENTS_REMOTE = "1";
    expect(getServerHostname()).toBe("0.0.0.0");
  });
});
