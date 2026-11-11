import { describe, expect, it, vi } from "vitest";
import { stringify } from "yaml";
import { parseConfig, type Condition, type ScoringConfig } from "../src/server/scoring/config";
import { calculatePreScore } from "../src/server/scoring/engine";
import { sha256 } from "../src/server/identity";
import { loaded, scoringInput } from "./slice02-helpers";
import { RegistryService } from "../src/server/service";
import { importOfficial, tempStore } from "./helpers";

const invalidConfig = (change: (config: ScoringConfig) => void) => {
  const config = structuredClone(loaded.config);
  change(config);
  return stringify(config);
};
const rejectsBeforeCalculation = (yaml: string) => {
  const error = expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" });
  expect(() => parseConfig(yaml)).toThrow(error);
  const input = scoringInput({ annual_instances: true, primary_kpi_defined: true, before_after_comparable: false });
  input.configYaml = yaml; input.configChecksum = sha256(yaml);
  expect(() => calculatePreScore(input)).toThrow(error);
};

describe("B-01: malformed config is rejected before evaluator execution", () => {
  it("B01-A: boolean declared for quantitative V1 cannot become a formal score", () => {
    rejectsBeforeCalculation(invalidConfig(c => { c.criteria.V1.inputs.annual_instances.type = "boolean"; }));
  });
  it("B01-B: all_items requires an actual collection member", () => {
    rejectsBeforeCalculation(invalidConfig(c => { c.criteria.F2.rules![0] = { score: 5, path: "integrations", op: "all_items", value: false }; }));
  });
  it("B01-C: group and leaf cannot coexist in one node", () => {
    rejectsBeforeCalculation(invalidConfig(c => { c.criteria.F5.rules![0] = Object.assign({ score: 5, all: [{ path: "primary_kpi_defined", op: "eq", value: true }] },
      { path: "before_after_comparable", op: "eq", value: true }); }));
  });
  it.each(["B01-A", "B01-B", "B01-C"])("%s uses existing config failure path without calling the scorer or publishing AVAILABLE", async scenario => {
    const yaml = invalidConfig(c => {
      if (scenario === "B01-A") c.criteria.V1.inputs.annual_instances.type = "boolean";
      if (scenario === "B01-B") c.criteria.F2.rules![0] = { score: 5, path: "integrations", op: "all_items", value: false };
      if (scenario === "B01-C") c.criteria.F5.rules![0] = Object.assign({ score: 5, all: [{ path: "primary_kpi_defined", op: "eq", value: true }] },
        { path: "before_after_comparable", op: "eq", value: true });
    });
    const storage = tempStore();
    try {
      const scorer = vi.fn(calculatePreScore), service = new RegistryService(storage.store, () => parseConfig(yaml), scorer);
      const id = importOfficial(service).selectableProcesses[0].processId, open = service.openProcess(id);
      expect(open.job).not.toBeNull();
      await service.runScore(open.job!);
      const result = service.readProcess(id), record = storage.store.read().processes[id];
      expect(scorer).not.toHaveBeenCalled();
      expect(result.scoreProcessing).toMatchObject({ state: "FAILED", error: { code: "INCOMPLETE_SCORING_SPEC", retryable: false } });
      expect(result.activeScoreSnapshot).toBeNull(); expect(record.scoreSnapshots).toEqual([]); expect(record.inputSnapshots).toEqual([]);
      expect(result.processName).toBe(open.view.processName); expect(result.sourceFacts).toEqual(open.view.sourceFacts);
      expect(result.dataQualityIssues).toEqual(open.view.dataQualityIssues);
    } finally { storage.cleanup(); }
  });
  it.each([
    ["V2", "annual_instances"], ["V2", "hours_per_instance"], ["V2", "annual_labor_hours"],
    ["V3", "manual_work_share_percent"], ["V4", "standard_scenario_share_percent"],
    ["V5", "problem_case_share_percent"], ["V5", "return_rate"], ["V5", "error_rate"], ["V5", "delay_rate"],
    ["V5", "rework_rate"], ["V5", "complaint_rate"], ["F1", "data_coverage_percent"],
    ["F4", "technical_time_estimate"], ["F5", "kpi_count"],
  ])("rejects boolean quantitative declaration %s.%s", (id, field) => {
    rejectsBeforeCalculation(invalidConfig(c => { c.criteria[id].inputs[field].type = "boolean"; }));
  });
  const malformedNodes: [string, string, Condition][] = [
    ["both groups", "F2", Object.assign({ all: [{ path: "integrations", op: "count_eq", value: 0 }] }, { any: [{ path: "complex_approvals_required", op: "eq", value: false }] })],
    ["unknown group field", "F2", Object.assign({ all: [{ path: "integrations", op: "count_eq", value: 0 }] }, { ignored: true })],
    ["unknown leaf field", "F2", Object.assign({ path: "integrations", op: "count_eq", value: 0 }, { ignored: true })],
    ["empty group", "F2", { all: [] }],
    ["any_item without member", "F2", { path: "integrations", op: "any_item", value: true }],
    ["unknown member", "F2", { path: "integrations.missing", op: "all_items", value: true }],
    ["extra path segment", "F2", { path: "integrations.api_documented.extra", op: "all_items", value: true }],
    ["scalar operator on array", "F2", { path: "integrations", op: "eq", value: true }],
    ["scalar operator on item path", "F2", { path: "integrations.api_documented", op: "eq", value: true }],
    ["collection operator on scalar", "F2", { path: "complex_approvals_required", op: "all_items", value: true }],
    ["count on member", "F2", { path: "integrations.api_documented", op: "count_eq", value: 1 }],
    ["flag count on string member", "F2", { path: "integrations.system_name", op: "count_items_gte", value: 1 }],
    ["flag count without selector", "F2", { path: "integrations", op: "count_items_gte", value: 1 }],
    ["wrong member operand", "F2", { path: "integrations.api_documented", op: "all_items", value: "true" }],
    ["filter on scalar", "F2", { path: "complex_approvals_required", op: "eq", value: true, filter: { critical: true } }],
    ["wrong filter operand", "F2", { path: "integrations", op: "count_eq", value: 1, filter: { critical: "true" } }],
    ["unknown filter member", "F2", { path: "integrations", op: "count_eq", value: 1, filter: { unknown: true } }],
    ["extra bounds on scalar", "F2", { path: "complex_approvals_required", op: "eq", value: true, min: 0 }],
    ["value on null operator", "F2", { path: "complex_approvals_required", op: "is_null", value: true }],
    ["value on count_between", "F2", { path: "integrations", op: "count_between", min: 0, max: 1, value: 0 }],
    ["numeric operator on boolean", "F5", { path: "primary_kpi_defined", op: "gte", value: 1 }],
    ["wrong scalar operand", "F5", { path: "primary_kpi_defined", op: "eq", value: 1 }],
    ["wrong enum operand", "F5", { path: "measurement_mode", op: "eq", value: "unknown-mode" }],
    ["mixed in operands", "F5", { path: "measurement_mode", op: "in", value: ["quantitative", false] }],
  ];
  it.each(malformedNodes)("rejects %s", (_name, id, node) => {
    rejectsBeforeCalculation(invalidConfig(c => { c.criteria[id].rules![0] = { score: 5, ...node }; }));
  });
  it("rejects mixed forms recursively and in blocker conditions", () => {
    const mixed = Object.assign({ all: [{ path: "legal_infosec_pdn_block", op: "eq", value: true }] }, { path: "legal_infosec_pdn_block", op: "eq", value: false });
    rejectsBeforeCalculation(invalidConfig(c => { c.blocker_policy.rules.LEGAL_INFOSEC_PDN_BLOCK.trigger = { any: [mixed] }; }));
  });
  it.each(["enum choices", "item kind", "unsupported input", "missing scalar input"]) ("rejects incomplete %s schema", change => {
    rejectsBeforeCalculation(invalidConfig(c => {
      if (change === "enum choices") delete c.criteria.F5.inputs.measurement_mode.allowed;
      if (change === "item kind") c.criteria.F2.inputs.integrations.item_schema!.api_documented.type = "string";
      if (change === "unsupported input") c.criteria.F5.inputs.ignored = { type: "boolean", unit: null };
      if (change === "missing scalar input") delete c.criteria.F4.inputs.deliverable_type;
    }));
  });
  it("approved scalar/collection/filter forms still produce the official partial PRE-SCORE", () => {
    expect(parseConfig(loaded.yaml).checksum).toBe(loaded.checksum);
    const result = calculatePreScore(scoringInput({ annual_instances: 12, hours_per_instance: 4 }));
    expect(result.resultContractVersion).toBe("slice02.pre-score.v1");
    expect(result.value).toMatchObject({ knownCount: 2, fullScore: null, knownSum: 3, range: [6, 18] });
  });
});
