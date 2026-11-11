import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { parseConfig } from "../src/server/scoring/config";
import { assertPublishable, calculatePreScore } from "../src/server/scoring/engine";
import { evaluateCondition } from "../src/server/scoring/conditions";
import type { Fact, FactValue } from "../src/server/domain";
import { loaded, scoringFact, scoringInput } from "./slice02-helpers";

const run = (values: Record<string, FactValue>, extra: Fact[] = []) => calculatePreScore(scoringInput(values, extra));
const criterion = (values: Record<string, FactValue>, id: string, extra: Fact[] = []) => {
  const result = run(values, extra); return [...result.value.criteria, ...result.feasibility.criteria].find(c => c.id === id)!;
};
const integration = (overrides: Record<string, FactValue> = {}) => ({ system_name: "System", critical: false, mechanism: "API", api_documented: true,
  access_confirmed: true, custom_development_required: false, approval_required: false, available: true, closed_system: false,
  minor_adaptation_required: false, mechanism_technically_understood: true, realistic_workaround_available: true, permitted_integration_method_available: true, ...overrides });
const f3 = (overrides: Record<string, FactValue> = {}) => ({ required_technologies: [{ name: "TS", standard_stack: true, understood_by_team: true, new_learning_required: false }],
  critical_competencies: [{ name: "Backend", available_in_team: true, realistic_closure_available: true }], ml_cv_ds_required: false, rd_required: false,
  technical_dependencies: [], technical_risks: [], solution_feasible: true, poc_required: false, ...overrides });
const f4 = (overrides: Record<string, FactValue> = {}) => ({ mvp_scope_defined: true, end_to_end_scenario_defined: true, secondary_functions_excludable: true,
  critical_external_dependencies: [], technical_time_estimate: 3, user_value_demonstrable: true, measurable_result_demonstrable: true,
  scope_limitation_required: false, deliverable_type: "end_to_end_mvp", limited_prototype_feasible_within_3_months: true, standalone_useful_scope_possible: true, ...overrides });
const f5 = (overrides: Record<string, FactValue> = {}) => ({ primary_kpi_defined: true, kpi_count: 1, baseline_available: true, baseline_collectable: false,
  before_after_comparable: true, measurement_method_defined: true, baseline_partial: false, measurement_mode: "quantitative", indirect_indicators_used: false, ...overrides });

describe("S02-T01–06/10: ten deterministic evaluators and VALUE inputs", () => {
  it("executes exactly ten evaluators with required traces; pilot 2+8 is AVAILABLE-compatible", () => {
    const result = run({ annual_instances: 12, hours_per_instance: 4 });
    expect(result.resultContractVersion).toBe("slice02.pre-score.v1");
    expect(result.criterionResults.map(c => c.criterionId)).toEqual(["V1", "V2", "V3", "V4", "V5", "F1", "F2", "F3", "F4", "F5"]);
    expect(result.value).toMatchObject({ knownSum: 3, knownCount: 2, unknownCount: 3, range: [6, 18], fullScore: null, coverage: .4 });
    expect(result.feasibility).toMatchObject({ knownSum: 0, knownCount: 0, unknownCount: 5, range: [5, 25], fullScore: null, coverage: 0 });
    for (const c of [...result.value.criteria, ...result.feasibility.criteria]) {
      expect(c.ruleId).toBe(loaded.config.criteria[c.id].rule_id); expect(c.reasonCode).toBeTruthy(); expect(c.explanation).toBeTruthy();
      expect(c.appliedRuleTrace).toContain(`"evaluator":"${c.id}"`); expect(c.provenance?.scoreSnapshotId).toBe(result.scoreSnapshotId);
    }
    expect(() => assertPublishable(result, scoringInput({ annual_instances: 12, hours_per_instance: 4 }))).not.toThrow();
  });
  it.each([[0, 1], [10, 1], [10.01, 2], [30, 2], [30.01, 3], [60, 3], [60.01, 4], [85, 4], [85.01, 5], [100, 5], [-1, null], [101, null], ["20", null], [null, null]])("V3 Confirmed percent %s → %s", (value, expected) => {
    expect(criterion({ manual_work_share_percent: value }, "V3").score).toBe(expected);
  });
  it.each([
    { factStatus: "Unknown" }, { factStatus: "Inferred" }, { sourceType: "llm_hypothesis", factStatus: "Inferred" },
    { sourceType: "interview" }, { sourceType: "document" }, { unit: "fraction" }, { sourceReferenceIds: [] },
    { factStatus: "Derived", sourceType: "calculated", derivation: { ruleId: "derive", ruleVersion: "1", inputFactIds: ["fact:annual_instances"], trace: "fixture" } },
  ] satisfies Partial<Fact>[]) ("V3 excluded input %j is null without eligible provenance", overrides => {
    const c = criterion({ annual_instances: 12 }, "V3", [scoringFact("manual_work_share_percent", 50, overrides)]);
    expect(c.score).toBeNull(); expect(c.missingInputs).toContain("manual_work_share_percent"); expect(c.reasonCode).toBeTruthy();
    expect(c.provenance?.inputFactIds).toEqual([]); expect(c.sourceReferenceIds).toEqual([]);
  });
  it("P/Q/R do not provide V3, and no proxy fact is created", () => {
    const result = run({ paper_status: "paper", digitalization_level: "non_digital", machine_readability: "non_machine_readable" });
    expect(result.value.criteria[2]).toMatchObject({ score: null, missingInputs: ["manual_work_share_percent"] });
    expect(result.derivedFacts.some(f => f.field === "manual_work_proxy")).toBe(false);
  });
  it("V2 semantic verification flag keeps PRE score and creates a separate verification risk", () => {
    const result = run({ annual_instances: 12, hours_per_instance: 256, hours_per_instance_semantic_verification_required: true });
    expect(result.value.criteria[1].score).toBe(4); expect(result.value.criteria[1].riskIds).toHaveLength(1);
    expect(result.risks!.find(r => r.id === result.value.criteria[1].riskIds![0])?.description).toContain("активные человеко-часы");
  });
  it.each([[0, 1], [19.99, 1], [20, 2], [39.99, 2], [40, 3], [69.99, 3], [70, 4], [89.99, 4], [90, 5], [100, 5], [101, null]])("V4 quantitative %s → %s", (value, score) => {
    expect(criterion({ standard_scenario_share_percent: value }, "V4").score).toBe(score);
  });
  it.each([["unique", 1], ["mostly_unique", 2], ["mixed", 3], ["mostly_standard", 4], ["standard", 5], ["constructor", null]])("V4 enum %s → %s", (value, score) => {
    expect(criterion({ repeatability_level: value }, "V4").score).toBe(score);
  });
  it("V4 contradiction produces conflict rather than choosing a convenient input", () => {
    const result = run({ standard_scenario_share_percent: 95, repeatability_level: "unique" });
    expect(result.value.criteria[3].score).toBeNull(); expect(result.value.criteria[3].conflictIds).toEqual([result.conflicts![0].id]);
  });
  it("V4 qualitative fallback requires Confirmed evidence", () => {
    const c = criterion({}, "V4", [scoringFact("repeatability_level", "standard", { factStatus: "Inferred" })]);
    expect(c.score).toBeNull(); expect(c.missingInputs).toContain("repeatability_level");
  });
  it.each([[0, 1], [1, 1], [1.01, 2], [5, 2], [5.01, 3], [15, 3], [15.01, 4], [30, 4], [30.01, 5], [100, 5]])("V5 percentage %s → %s", (value, score) => {
    expect(criterion({ problem_case_share_percent: value }, "V5").score).toBe(score);
  });
  it.each([["practically_none", 1], ["rare", 2], ["periodic", 3], ["frequent", 4], ["systemic", 5]])("V5 confirmed qualitative %s → %s", (value, score) => {
    expect(criterion({ problematicity_level: value }, "V5").score).toBe(score);
  });
  it("V5 takes the maximum eligible rate with deterministic Derived provenance; primary percent has priority", () => {
    const result = run({ return_rate: 2, error_rate: 17, problematicity_level: "rare" }, [scoringFact("complaint_rate", 99, { factStatus: "Inferred", factId: "excluded" })]);
    expect(result.value.criteria[4].score).toBe(4);
    expect(result.derivedFacts[0]).toMatchObject({ field: "problem_proxy", value: 17, factStatus: "Derived", derivation: { ruleId: "DERIVE_PROBLEM_PROXY_v1.1" } });
    expect(result.sourceReferences[0].derivation?.inputSourceReferenceIds).toContain("source:error_rate");
    expect(criterion({ problem_case_share_percent: 0, error_rate: 99 }, "V5").score).toBe(1);
    expect(criterion({ return_rate: -1, problematicity_level: "rare" }, "V5").score).toBe(2);
  });
  it("V5 proxy priority is independent of contradicting lower-priority qualitative sources", () => {
    const c = criterion({ error_rate: 17, problematicity_level: "rare" }, "V5", [scoringFact("problematicity_level", "systemic", { factId: "other-qualitative" })]);
    expect(c.score).toBe(4); expect(c.conflictIds).toEqual([]); expect(c.provenance!.inputFactIds).not.toContain("other-qualitative");
  });
});

describe("S02-T30/31: FEASIBILITY components, overlaps, unknown constraints", () => {
  it.each([["unknown", null], ["confirmed_no_access", 1], ["strongly_restricted", 2], ["partial_or_after_approval", 3], ["mostly_available", 4], ["confirmed_ready", 5], ["constructor", null]])("F1 access %s → %s", (access, score) => {
    expect(criterion({ data_coverage_percent: 100, data_access_level: access, data_readiness_level: "structured_machine_readable_ready" }, "F1").score).toBe(score);
  });
  it("F1 incomplete mandatory components stay null", () => { expect(criterion({ data_access_level: "confirmed_no_access" }, "F1")).toMatchObject({ score: null, missingInputs: ["data_coverage_percent", "data_readiness_level"] }); });
  it.each([
    [[], false, 5], [[integration({ api_documented: false, minor_adaptation_required: true })], false, 4],
    [[integration(), integration(), integration()], false, 3],
    [[integration({ api_documented: false, closed_system: true }), integration({ api_documented: false, closed_system: true })], true, 2],
    [[integration({ critical: true, permitted_integration_method_available: false })], false, 1],
  ] as [FactValue[], boolean, number][]) ("F2 rules %j / approvals %s → %s", (integrations, approvals, score) => {
    expect(criterion({ integrations, complex_approvals_required: approvals }, "F2").score).toBe(score);
  });
  it.each([
    [f3({ technical_risks: [{ description: "one", severity: "moderate" }, { description: "two", severity: "moderate" }] }), 5],
    [f3(), 4], [f3({ poc_required: true, technical_risks: [{ description: "one", severity: "moderate" }, { description: "two", severity: "moderate" }] }), 3],
    [f3({ technical_risks: [{ description: "significant", severity: "significant" }] }), 2],
    [f3({ technical_dependencies: [{ name: "research", controlled: false, uncertain_research_outcome: true }] }), 1],
  ] as [Record<string, FactValue>, number][]) ("F3 supported conditions %j → %s", (values, score) => { expect(criterion(values, "F3").score).toBe(score); });
  it.each([
    [f4(), 5], [f4({ scope_limitation_required: true }), 4], [f4({ end_to_end_scenario_defined: false, deliverable_type: "strongly_limited_useful_mvp" }), 3],
    [f4({ end_to_end_scenario_defined: false, deliverable_type: "poc" }), 2], [f4({ standalone_useful_scope_possible: false }), 1],
  ] as [Record<string, FactValue>, number][]) ("F4 conditions %j → %s", (values, score) => { expect(criterion(values, "F4").score).toBe(score); });
  it.each([
    [f5(), 5], [f5({ kpi_count: 2, baseline_collectable: true, measurement_method_defined: false }), 4],
    [f5({ baseline_available: false, baseline_collectable: true }), 3],
    [f5({ baseline_available: false, measurement_mode: "qualitative", indirect_indicators_used: true }), 2],
    [f5({ primary_kpi_defined: false, before_after_comparable: false }), 1],
  ] as [Record<string, FactValue>, number][]) ("F5 conditions %j → %s", (values, score) => { expect(criterion(values, "F5").score).toBe(score); });
  it.each(["F2", "F3", "F4", "F5"]) ("%s unknown is null + verification risk, never penalty", id => {
    const result = run({}); const c = result.feasibility.criteria.find(c => c.id === id)!;
    expect(c.score).toBeNull(); expect(c.riskIds).toHaveLength(1);
    expect(result.risks!.find(r => r.id === c.riskIds![0])).toMatchObject({ type: "RISK", code: "RISK_REQUIRES_VERIFICATION", confirmationState: "UNCONFIRMED" });
  });
  it("minimum overlap is recorded; numeric score can coexist with verification risk and confirmed blocker", () => {
    const result = run({ integrations: [integration({ critical: true, permitted_integration_method_available: false })] });
    expect(result.feasibility.criteria[1]).toMatchObject({ score: 1, missingInputs: ["complex_approvals_required"] });
    const decisions = JSON.parse(JSON.parse(result.feasibility.criteria[1].appliedRuleTrace!).steps[0]);
    expect(decisions.decisions).toEqual(expect.arrayContaining([{ score: 5, decision: true }, { score: 1, decision: true }]));
    expect(decisions.selectedScore).toBe(1);
    expect(result.blockers![0]).toMatchObject({ code: "CRITICAL_INTEGRATION_UNAVAILABLE", confirmationState: "CONFIRMED" });
    expect(result.risks).not.toHaveLength(0);
  });
  it("nullable item constraints remain unknown, never confirmed absence", () => {
    const c = criterion({ integrations: [integration({ permitted_integration_method_available: null, api_documented: null, access_confirmed: null, available: null, custom_development_required: null, minor_adaptation_required: null, critical: true })] }, "F2");
    expect(c.score).toBeNull(); expect(c.riskIds).toHaveLength(1); expect(c.blockerIds).toEqual([]);
  });
});

describe("S02-T07–09/11–15/22/37/38: integrity, concerns and configuration", () => {
  it("full axes use backend sums, counts and collapsed ranges; stage remains PRE", () => {
    const result = run({ annual_instances: 1000, hours_per_instance: 10, manual_work_share_percent: 100, standard_scenario_share_percent: 100,
      problem_case_share_percent: 100, data_coverage_percent: 100, data_access_level: "confirmed_ready", data_readiness_level: "structured_machine_readable_ready",
      integrations: [], complex_approvals_required: false, ...f3(), ...f4(), ...f5() });
    expect(result.value).toMatchObject({ fullScore: 25, knownSum: 25, knownCount: 5, unknownCount: 0, coverage: 1, range: [25, 25] });
    expect(result.feasibility).toMatchObject({ fullScore: 24, knownSum: 24, knownCount: 5, unknownCount: 0, coverage: 1, range: [24, 24] });
    expect(result.stage).toBe("PRE_SCORE");
  });
  it("contradicting Confirmed percent produces linked conflict, preserves sources and leaves V1 independent", () => {
    const result = run({ annual_instances: 12, manual_work_share_percent: 10 }, [scoringFact("manual_work_share_percent", 100, { factId: "second", sourceReferenceIds: ["second-source"] })]);
    expect(result.value.criteria[0].score).toBe(2); expect(result.value.criteria[2].score).toBeNull();
    expect(result.conflicts![0].sourceReferenceIds).toEqual(["source:manual_work_share_percent", "second-source"]);
    expect(result.value.criteria[2].conflictIds).toEqual([result.conflicts![0].id]);
  });
  it("process blocker coexists with score; unconfirmed blocker stays a risk", () => {
    const result = run({ annual_instances: 12, legal_infosec_pdn_block: true });
    expect(result.blockers!.some(b => b.code === "LEGAL_INFOSEC_PDN_BLOCK" && b.confirmationState === "CONFIRMED")).toBe(true);
    expect(result.value.criteria[0].score).toBe(2);
    const unconfirmed = run({}, [scoringFact("legal_infosec_pdn_block", true, { factStatus: "Inferred" })]);
    expect(unconfirmed.blockers).toEqual([]); expect(unconfirmed.risks!.some(r => r.description.includes("LEGAL_INFOSEC_PDN_BLOCK"))).toBe(true);
  });
  it("same immutable input reproduces complete result and actual config identity", () => {
    const input = scoringInput({ return_rate: 30 }); const a = calculatePreScore(input), b = calculatePreScore(structuredClone(input));
    expect(a).toEqual(b); expect(a.scoringConfigVersion).toBe(`sha256:${loaded.checksum}`);
    expect(a.engineVersion).toBe("slice-02-engine-1"); expect(a.sourceReferences).toEqual(b.sourceReferences);
  });
  it.each(["V3-input", "V3-derived", "V3-fallback", "condition", "item-schema", "component", "problem-rule", "blocker", "bounds", "missing", "axis", "policy", "V2-semantic", "V4-priority", "blocker-set", "priority-order", "proxy-inputs", "count-type", "comparison-type", "input-bounds", "PRE-evidence"]) ("invalid %s config fails before scoring", mutation => {
    const c = structuredClone(loaded.config);
    if (mutation === "V3-input") c.criteria.V3.required_inputs = [];
    if (mutation === "V3-derived") c.criteria.V3.evidence_requirements.derived_input_allowed = true;
    if (mutation === "V3-fallback") (c.criteria.V3.input_selection as Record<string, unknown>).fallback_allowed = true;
    if (mutation === "condition") c.criteria.F2.rules![0] = { score: 5, all: [{ path: "constructor", op: "eq", value: true }] };
    if (mutation === "item-schema") delete c.criteria.F2.inputs.integrations.item_schema;
    if (mutation === "component") delete c.criteria.F1.components!.access.enum_mappings!.confirmed_no_access;
    if (mutation === "problem-rule") delete c.derived_fact_rules.problem_proxy;
    if (mutation === "blocker") c.blocker_policy.rules.LEGAL_INFOSEC_PDN_BLOCK.evidence_status_required = "Inferred";
    if (mutation === "bounds") c.axis_aggregation.range.unknown_criterion_max = 6;
    if (mutation === "missing") c.criteria.F3.missing_behavior.score = 1;
    if (mutation === "axis") c.criteria.V4.axis = "FEASIBILITY";
    if (mutation === "policy") delete c.rule_overlap_policy;
    if (mutation === "V2-semantic") delete c.criteria.V2.semantic_verification;
    if (mutation === "V4-priority") delete c.criteria.V4.input_priority;
    if (mutation === "blocker-set") delete c.blocker_policy.rules.LEGAL_INFOSEC_PDN_BLOCK;
    if (mutation === "priority-order") (c.criteria.V5.input_priority as string[]).reverse();
    if (mutation === "proxy-inputs") (c.criteria.V5.alternative_rate_proxy as Record<string, unknown>).inputs = [];
    if (mutation === "count-type") c.criteria.F2.rules![0] = { score: 5, path: "integrations", op: "count_eq", value: "0" };
    if (mutation === "comparison-type") c.criteria.F4.rules![0] = { score: 5, path: "technical_time_estimate", op: "lte", value: "three" };
    if (mutation === "input-bounds") c.criteria.V3.inputs.manual_work_share_percent.valid_min = 101;
    if (mutation === "PRE-evidence") (c.evidence_policy as Record<string, unknown>).PRE_SCORE = { allowed: [{ status: "Confirmed", source_type: "interview" }] };
    expect(() => parseConfig(stringify(c))).toThrow(expect.objectContaining({ code: "INCOMPLETE_SCORING_SPEC" }));
  });
  it.each(["ids", "count", "sum", "range", "snapshot", "evidence", "trace", "marker", "config"]) ("backend publication rejects invalid %s result", mutation => {
    const input = scoringInput({ annual_instances: 12, hours_per_instance: 4 }), result = calculatePreScore(input);
    if (mutation === "ids") result.value.criteria[1].id = "V1";
    if (mutation === "count") result.value.knownCount = 3;
    if (mutation === "sum") result.value.knownSum = 4;
    if (mutation === "range") result.value.range = [7, 18];
    if (mutation === "snapshot") result.feasibility.scoreSnapshotId = "other";
    if (mutation === "evidence") result.value.criteria[0].provenance!.inputFactIds = ["fake"];
    if (mutation === "trace") result.criterionResults.pop();
    if (mutation === "marker") delete result.resultContractVersion;
    if (mutation === "config") result.scoringConfigVersion = "1.0";
    expect(() => assertPublishable(result, input)).toThrow(expect.objectContaining({ code: "INVALID_SCORE_RESULT" }));
  });
  it("condition DSL preserves unknown in filters and count bounds", () => {
    const values = new Map<string, FactValue>([["items", [{ selected: null, ready: true }]]]);
    expect(evaluateCondition({ path: "items.ready", op: "any_item", value: true, filter: { selected: true } }, values)).toBeNull();
    expect(evaluateCondition({ path: "items", op: "count_items_eq", value: 0, filter: { selected: true } }, values)).toBeNull();
    expect(evaluateCondition({ path: "items.ready", op: "all_items", value: true, filter: { selected: true } }, values)).toBe(true);
    expect(evaluateCondition({ path: "items.ready", op: "all_items", value: false, filter: { selected: true } }, values)).toBeNull();
    expect(evaluateCondition({ all: [{ path: "missing", op: "eq", value: true }] }, values)).toBeNull();
  });
});
