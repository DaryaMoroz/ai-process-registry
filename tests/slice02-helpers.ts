import { loadConfig } from "../src/server/scoring/config";
import type { Fact, FactValue, InputSnapshot } from "../src/server/domain";
export const loaded = loadConfig();
export function scoringFact(field: string, value: FactValue, overrides: Partial<Fact> = {}): Fact {
  const def = Object.values(loaded.config.criteria).map(c => c.inputs[field]).find(Boolean);
  return { factId: `fact:${field}`, analysisUnitId: "unit", field, value, unit: def?.unit ?? null,
    factStatus: "Confirmed", sourceType: "registry", sourceReferenceIds: [`source:${field}`], ...overrides };
}
export function scoringInput(values: Record<string, FactValue> = {}, extra: Fact[] = []): InputSnapshot {
  return { inputSnapshotId: "slice02-input", analysisUnitId: "unit", methodologyVersion: "1.1", configVersion: "1.0", configChecksum: loaded.checksum,
    configYaml: loaded.yaml, mappingVersion: "1.0.0", cardVersion: 1, createdAt: "2026-10-05T00:00:00.000Z",
    facts: [...Object.entries(values).map(([field, value]) => scoringFact(field, value)), ...extra], conflictFields: [] };
}
