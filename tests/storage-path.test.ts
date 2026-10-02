import { randomUUID } from "node:crypto";
import { existsSync, symlinkSync, unlinkSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "../src/server/store";
import { tempStore } from "./helpers";

describe("Storage stays outside the read-only source area", () => {
  let temporary: ReturnType<typeof tempStore>;
  const source = path.resolve("source");
  beforeEach(() => { temporary = tempStore(); });
  afterEach(() => { temporary.cleanup(); });

  it("accepts a normal sibling data directory", () => {
    const directory = path.join(temporary.directory, "data");
    const store = new LocalStore(directory);
    expect(store.directory).toBe(path.resolve(directory));
    expect(store.read()).toEqual({ schemaVersion: 1, registries: {}, processes: {}, audit: [] });
    expect(existsSync(path.join(directory, "state.json"))).toBe(true);
  });

  it("accepts a parent traversal that actually resolves outside source", () => {
    const directory = source + path.sep + ".." + path.sep + path.relative(process.cwd(), temporary.directory) + path.sep + "data";
    expect(new LocalStore(directory).directory).toBe(path.join(temporary.directory, "data"));
  });

  it.each([
    () => source,
    () => path.join(source, `blocked-${randomUUID()}`, "nested"),
    () => path.join(source, "..data", `blocked-${randomUUID()}`),
    () => source + path.sep + ".." + path.sep + "source" + path.sep + `blocked-${randomUUID()}`,
    () => source + path.sep + "folder" + path.sep + ".." + path.sep + `blocked-${randomUUID()}`,
  ])("rejects source containment after normalization before creating storage (%#)", makePath => {
    const directory = makePath(), existed = existsSync(directory);
    expect(() => new LocalStore(directory)).toThrow("Storage cannot be inside source/");
    expect(existsSync(directory)).toBe(existed);
  });

  it("rejects an existing junction/symlink ancestor into source, including a nonexistent suffix", () => {
    const link = path.join(temporary.directory, "source-link");
    symlinkSync(source, link, process.platform === "win32" ? "junction" : "dir");
    try {
      const suffix = `blocked-${randomUUID()}`;
      expect(() => new LocalStore(link)).toThrow("Storage cannot be inside source/");
      expect(() => new LocalStore(path.join(link, suffix, "data"))).toThrow("Storage cannot be inside source/");
      expect(existsSync(path.join(source, suffix))).toBe(false);
    } finally { unlinkSync(link); }
  });

  it.skipIf(process.platform !== "win32")("uses case-insensitive Windows path containment", () => {
    const directory = path.join(source.toUpperCase(), `blocked-${randomUUID()}`);
    expect(() => new LocalStore(directory)).toThrow("Storage cannot be inside source/");
    expect(existsSync(directory)).toBe(false);
  });
});
