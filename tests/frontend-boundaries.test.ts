import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("frontend modules cannot import the server scoring/parser layer or read its YAML/files", () => {
  const files = ["src/features", "src/shared"].flatMap(root => readdirSync(root, { recursive: true }).map(name => path.join(root, String(name))).filter(file => /\.tsx?$/.test(file)));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    expect(code, file).not.toMatch(/(?:from\s*|import\s*\(|require\s*\()\s*["'][^"']*(?:\/server\/|node:fs|scoring_config|\.ya?ml)/);
    expect(code, file).not.toMatch(/calculatePreScore|bandScore|readWorkbook|eligibleForPre/);
  }
});
