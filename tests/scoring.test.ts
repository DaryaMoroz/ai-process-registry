import { describe, it, expect } from "vitest";
import { stringify } from "yaml";
import { loadConfig, parseConfig } from "../src/server/scoring/config";
import { calculatePreScore, eligibleForPre } from "../src/server/scoring/engine";
import type { Fact, InputSnapshot } from "../src/server/domain";

const loaded = loadConfig();
function fact(field: string, value: number, overrides: Partial<Fact> = {}): Fact {
  return { factId: field, analysisUnitId: "unit", field, value, unit: loaded.config.criteria.V2.inputs[field]?.unit ?? null,
    factStatus: "Confirmed", sourceType: "registry", sourceReferenceIds: [`source:${field}`], ...overrides };
}
function input(facts: Fact[], conflictFields: string[] = []): InputSnapshot {
  return { inputSnapshotId: "input-1", analysisUnitId: "unit", methodologyVersion: "1.1", configVersion: "1.0", configChecksum: loaded.checksum, configYaml: loaded.yaml,
    mappingVersion: "1.0.0", cardVersion: 1, createdAt: "2026-01-01T00:00:00.000Z", facts, conflictFields };
}
const scores = (annual: number, hours = 4) => calculatePreScore(input([fact("annual_instances", annual), fact("hours_per_instance", hours)]));
describe("TC-24–25,29,31,34,37,44,48,50–52: deterministic V1/V2", () => {
  it.each([[0, null], [1, 1], [11, 1], [12, 2], [51, 2], [52, 3], [249, 3], [250, 4], [999, 4], [1000, 5], [1001, 5], [-1, null], [11.5, null]])("V1 boundary %s → %s", (annual, expected) => {
    expect(scores(annual).value.criteria[0].score).toBe(expected);
  });
  it.each([[0, 1], [99.9, 1], [100, 2], [499.9, 2], [500, 3], [1999.9, 3], [2000, 4], [9999.9, 4], [10000, 5]])("V2 annual labor boundary %s → %s", (labor, expected) => {
    expect(scores(1, labor).value.criteria[1].score).toBe(expected);
  });
  it("produces correct partial axes and full provenance for official row 9", () => {
    const result = scores(12);
    expect(result.value).toMatchObject({ fullScore: null, knownSum: 3, coverage: .4, range: [6, 18], maxScore: 25 });
    expect(result.feasibility).toMatchObject({ fullScore: null, knownSum: 0, coverage: 0, range: [5, 25], maxScore: 25 });
    expect(result.criterionResults).toHaveLength(10);
    expect(result.criterionResults.slice(2).every(c => c.score === null)).toBe(true);
    expect(result.stage).toBe("PRE_SCORE");
    expect(result.derivedFacts[0]).toMatchObject({ field: "annual_labor_hours", value: 48, factStatus: "Derived", sourceType: "calculated",
      derivation: { ruleId: "DERIVE_ANNUAL_LABOR_HOURS_v1.1", ruleVersion: "1.1", inputFactIds: ["annual_instances", "hours_per_instance"] } });
    expect(result.sourceReferences[0].derivation?.inputSourceReferenceIds).toEqual(["source:annual_instances", "source:hours_per_instance"]);
    expect(result.criterionResults[1].ruleId).toBe("V2_LABOR_v1.1");
    expect(result.criterionResults[1].evidence).toHaveLength(3);
  });
  it("is byte-for-byte reproducible, including trace and snapshot metadata", () => {
    const snapshot = input([fact("annual_instances", 1440), fact("hours_per_instance", 17.5)]);
    expect(JSON.stringify(calculatePreScore(snapshot))).toBe(JSON.stringify(calculatePreScore(structuredClone(snapshot))));
    expect(calculatePreScore(snapshot).value).toMatchObject({ knownSum: 10, coverage: .4, range: [13, 25], fullScore: null });
  });
  it("leaves missing inputs null and keeps V1 independent of invalid K", () => {
    const result = calculatePreScore(input([fact("annual_instances", 12)]));
    expect(result.value.criteria[0].score).toBe(2);
    expect(result.value.criteria[1]).toMatchObject({ score: null, missingInputs: ["hours_per_instance"] });
    expect(calculatePreScore(input([])).value).toMatchObject({ knownSum: 0, range: [5, 25], coverage: 0, fullScore: null });
  });
  it.each([
    { factStatus: "Inferred", sourceType: "llm_hypothesis" }, { factStatus: "Confirmed", sourceType: "interview" },
    { factStatus: "Confirmed", sourceType: "document" }, { factStatus: "Unknown", sourceType: "registry" },
    { factStatus: "Derived", sourceType: "calculated" },
  ] as Partial<Fact>[]) ("excludes inadmissible evidence %j", overrides => {
    const result = calculatePreScore(input([fact("annual_instances", 1000, overrides), fact("hours_per_instance", 4)]));
    expect(result.value.criteria[0].score).toBe(null); expect(result.value.criteria[1].score).toBe(null);
  });
  it("requires complete registry-only provenance for Derived facts and rejects cycles", () => {
    const source = fact("annual_instances", 12);
    const derived = fact("hours_per_instance", 4, { factStatus: "Derived", sourceType: "calculated", derivation: { ruleId: "test-rule", ruleVersion: "1", inputFactIds: [source.factId], trace: "test" } });
    expect(eligibleForPre(derived, [source, derived])).toBe(true);
    derived.derivation!.inputFactIds = [derived.factId];
    expect(eligibleForPre(derived, [source, derived])).toBe(false);
  });
  it("never resolves conflicting confirmed inputs on its own", () => {
    const snapshot = input([fact("annual_instances", 12), fact("annual_instances", 999, { factId: "other" }), fact("hours_per_instance", 4)]);
    const result = calculatePreScore(snapshot);
    expect(result.criterionResults.slice(0, 2).every(c => c.conflict && c.score === null)).toBe(true);
  });
  it("validates all ten config definitions even though only V1/V2 execute", () => {
    expect(Object.keys(loaded.config.criteria)).toHaveLength(10);
    expect(parseConfig(loaded.yaml).checksum).toBe(loaded.checksum);
    const config = structuredClone(loaded.config); delete config.criteria.F5;
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it.each(["threshold", "rule", "enum", "input-unit", "policy", "derivation"]) ("rejects missing %s without defaults", mutation => {
    const config = structuredClone(loaded.config);
    if (mutation === "threshold") config.criteria.V1.thresholds!.pop();
    if (mutation === "rule") config.criteria.V2.rule_id = "";
    if (mutation === "enum") delete config.criteria.F1.components!.access.enum_mappings!.confirmed_no_access;
    if (mutation === "input-unit") config.criteria.V2.inputs.hours_per_instance.unit = null;
    if (mutation === "policy") delete config.conflict_policy;
    if (mutation === "derivation") config.derived_fact_rules.annual_labor_hours.provenance_required = false;
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it("does not accept altered input configuration metadata", () => {
    const snapshot = input([]); snapshot.configChecksum = "invalid";
    expect(() => calculatePreScore(snapshot)).toThrow(expect.objectContaining({ code: "INPUT_VERSION_MISMATCH" }));
  });
  it.each([undefined, [], "annual_instances", {}, ["annual_instances"], ["annual_instances", "annual_instances"], ["annual_instances", "unknown"], ["annual_instances", null]])("rejects invalid V2 required inputs %j before execution", required => {
    const config = structuredClone(loaded.config);
    config.criteria.V2.required_inputs = required;
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it.each(["V1", "F1", "F2", "F3", "F4", "F5"]) ("rejects empty array for %s mandatory inputs", id => {
    const config = structuredClone(loaded.config); config.criteria[id].required_inputs = [];
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it("rejects a required field absent from its input definitions", () => {
    const config = structuredClone(loaded.config); delete config.criteria.V2.inputs.hours_per_instance;
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it.each(["V3", "V4", "V5"]) ("keeps and validates the approved structured required inputs of %s", id => {
    const config = structuredClone(loaded.config); config.criteria[id].required_inputs = {};
    expect(() => parseConfig(stringify(config))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
});
