import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RegistryService } from "../src/server/service";
import { LocalStore } from "../src/server/store";
import { columns } from "../src/server/registry/profile";
import { ownValue } from "../src/server/lookup";
import { literal, synthetic, tempStore } from "./helpers";

let storage: ReturnType<typeof tempStore>;
let prototypeBefore: PropertyDescriptorMap;
beforeEach(() => { prototypeBefore = Object.getOwnPropertyDescriptors(Object.prototype); storage = tempStore(); });
afterEach(() => {
  try { expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(prototypeBefore); }
  finally {
    // A failing pre-fix regression must not contaminate other tests in this worker.
    for (const key of Object.getOwnPropertyNames(Object.prototype)) if (!Object.hasOwn(prototypeBefore, key)) Reflect.deleteProperty(Object.prototype, key);
    Object.defineProperties(Object.prototype, prototypeBefore);
    storage.cleanup();
  }
});
const unsafeIds = ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "isPrototypeOf", "unknown-id"];

describe("A. Registry/process ID lookups use only stored own records", () => {
  it("rejects arbitrary inherited keys, not just a blacklist of built-in names", () => {
    const dictionary = Object.create({ externalKey: { stored: false } }) as Record<string, { stored: boolean }>;
    expect(ownValue(dictionary, "externalKey")).toBeUndefined();
  });
  it("resolves explicitly stored own keys even when their names match prototype keys", () => {
    const dictionary = JSON.parse('{"__proto__":"own","constructor":"own","prototype":"own"}') as Record<string, string>;
    for (const key of ["__proto__", "constructor", "prototype"]) expect(ownValue(dictionary, key)).toBe("own");
  });
  it.each(unsafeIds)("rejects registry ID %s without changing prototype or store", id => {
    const service = new RegistryService(storage.store);
    const before = storage.store.read();
    expect(() => service.selectSheet(id, "Лист3")).toThrow(expect.objectContaining({ code: "REGISTRY_NOT_FOUND", status: 404 }));
    expect(() => service.readRegistry(id)).toThrow(expect.objectContaining({ code: "REGISTRY_NOT_FOUND", status: 404 }));
    service.processSheet(id, "stale-run");
    expect(storage.store.read()).toEqual(before);
    expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(prototypeBefore);
    expect(Object.hasOwn({}, "view")).toBe(false);
    expect("view" in {}).toBe(Object.hasOwn(prototypeBefore, "view"));
    expect("runId" in {}).toBe(Object.hasOwn(prototypeBefore, "runId"));
  });
  it.each(unsafeIds)("rejects neighboring process ID %s with controlled errors", id => {
    const service = new RegistryService(storage.store);
    for (const operation of [() => service.readProcess(id), () => service.openProcess(id), () => service.retryScore(id)]) {
      expect(operation).toThrow(expect.objectContaining({ code: "PROCESS_NOT_FOUND", status: 404 }));
    }
    expect(Object.keys(storage.store.read().processes)).toHaveLength(0);
  });
  it("keeps valid registry/process operations and exact prototype-like sheet names after restart", () => {
    const service = new RegistryService(storage.store);
    const meta = service.upload(synthetic({ name: "constructor" }), "valid.xlsx");
    const run = service.selectSheet(meta.registryVersionId, "constructor");
    service.processSheet(meta.registryVersionId, run.runId);
    const registry = service.readRegistry(meta.registryVersionId);
    expect(registry).toMatchObject({ canContinue: true, selectedSheet: "constructor", processingRunId: run.runId });
    expect(registry.selectableProcesses).toHaveLength(1);
    const processId = registry.selectableProcesses[0].processId;
    expect(service.openProcess(processId).view.processId).toBe(processId);
    const restored = new RegistryService(new LocalStore(storage.directory));
    expect(restored.readRegistry(meta.registryVersionId)).toEqual(registry);
    expect(restored.readProcess(processId).processName).toBe("Тестовый процесс");
  });
});

const enumColumns = columns.flatMap((column, index) => column.enums ? [{ column, letter: String.fromCharCode(65 + index) }] : []);
describe("B. Enum prototype keys cannot become facts or corrupt persistence", () => {
  it.each(["constructor", "__proto__", "prototype", "toString", "unknown-enum"])("rejects %s in every enum field through parser/mapping/service/store", value => {
    const service = new RegistryService(storage.store);
    const rows = Object.fromEntries(enumColumns.map(({ letter }, index) => {
      const row = index + 9;
      return [row, literal("D" + row, "Process " + row) + literal("K" + row, 4) + literal("L" + row, 12) + literal(letter + row, value)];
    }));
    const meta = service.upload(synthetic({ rows }), "enum.xlsx");
    const run = service.selectSheet(meta.registryVersionId, "Лист3"); service.processSheet(meta.registryVersionId, run.runId);
    const registry = service.readRegistry(meta.registryVersionId);
    expect(registry).toMatchObject({ state: "WARNING", canContinue: true });
    expect(registry.selectableProcesses).toHaveLength(enumColumns.length);
    const db = storage.store.read();
    for (const [{ column, letter }, index] of enumColumns.map((c, i) => [c, i] as const)) {
      const row = index + 9;
      const record = db.registries[meta.registryVersionId].sheets["Лист3"].rows.find(r => r.excelRowNumber === row)!;
      expect(record.cells.find(c => c.columnLetter === letter)).toMatchObject({ rawValue: value, normalizedValue: null, normalizationStatus: "UNMAPPED_ENUM_VALUE" });
      expect(registry.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNMAPPED_ENUM_VALUE", field: column.field, row })]));
      const process = Object.values(db.processes).find(p => p.sourceRowId === record.sourceRowId)!;
      expect(process.facts.some(f => f.field === column.field)).toBe(false);
      expect(process.facts.find(f => f.field === "annual_instances")?.value).toBe(12);
    }
    const restored = new RegistryService(new LocalStore(storage.directory));
    expect(restored.readRegistry(meta.registryVersionId)).toEqual(registry);
    expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(prototypeBefore);
  });
  it.each(enumColumns.flatMap(({ column, letter }) => Object.entries(column.enums!).map(([value, expected]) => ({ field: column.field, letter, value, expected }))))("preserves valid $field: $value", ({ field, letter, value, expected }) => {
    const service = new RegistryService(storage.store);
    const meta = service.upload(synthetic({ rows: { 9: literal("D9", "Process") + literal("K9", 4) + literal("L9", 12) + literal(letter + "9", value) } }), "valid-enum.xlsx");
    const run = service.selectSheet(meta.registryVersionId, "Лист3"); service.processSheet(meta.registryVersionId, run.runId);
    const registry = service.readRegistry(meta.registryVersionId);
    const process = storage.store.read().processes[registry.selectableProcesses[0].processId];
    expect(process.facts.find(f => f.field === field)?.value).toBe(expected);
    expect(registry.issues.some(i => i.field === field && i.code === "UNMAPPED_ENUM_VALUE")).toBe(false);
  });
});
