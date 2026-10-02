import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { ApplicationError } from "../errors";
import { sha256 } from "../identity";

export type Band = { score: number; min: number | null; max: number | null; min_inclusive: boolean; max_inclusive: boolean };
type Criterion = {
  criterion_id: string; result_key: string; axis: string; rule_id: string;
  required_inputs: unknown; inputs: Record<string, { type: string; unit: string | null; valid_min?: number; valid_max?: number }>;
  thresholds?: Band[]; rules?: { score: number; all?: unknown[]; any?: unknown[] }[];
  enum_mappings?: Record<string, number>;
  proxy?: { enum_mappings: Record<string, Record<string, number>>; rounding_bands: Band[] };
  components?: Record<string, { thresholds?: Band[]; enum_mappings?: Record<string, number | null> }>;
  missing_behavior: Record<string, unknown>; evidence_requirements: Record<string, unknown>;
  [key: string]: unknown;
};
export type ScoringConfig = {
  config_schema_version: string; methodology_version: string; normative_source: { file: string; sha256: string };
  criteria: Record<string, Criterion>; criterion_order: { VALUE: string[]; FEASIBILITY: string[] };
  derived_fact_rules: { annual_labor_hours: { derivation_rule_id: string; derivation_rule_version: string; operation: string; expression: string; inputs: { field: string; unit: string }[]; output: { field: string; unit: string }; provenance_required: boolean }; [key: string]: unknown };
  axis_aggregation: {
    axes: Record<"VALUE" | "FEASIBILITY", { criteria: string[]; criterion_count: number }>;
    full_score: { max: number; min: number; operation: string; if_any_criterion_null: null };
    known_sum: { operation: string; empty_sum: number };
    coverage: { expression: string };
    range: { unknown_criterion_min: number; unknown_criterion_max: number };
  };
  [key: string]: unknown;
};
export type LoadedConfig = { config: ScoringConfig; yaml: string; checksum: string };
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const nonempty = (v: unknown) => Object.keys(object(v)).length > 0;
const scoreSet = (values: unknown[]) => JSON.stringify([...new Set(values)].sort()) === "[1,2,3,4,5]";
const ids = ["V1", "V2", "V3", "V4", "V5", "F1", "F2", "F3", "F4", "F5"];
// Input-contract completeness from methodology 1.1; these checks do not calculate scores.
const requiredLists: Record<string, string[]> = {
  V1: ["annual_instances"], V2: ["annual_instances", "hours_per_instance"],
  F1: ["data_coverage_percent", "data_access_level", "data_readiness_level"],
  F2: ["integrations", "complex_approvals_required"],
  F3: ["required_technologies", "critical_competencies", "ml_cv_ds_required", "rd_required", "technical_dependencies", "technical_risks", "solution_feasible", "poc_required"],
  F4: ["mvp_scope_defined", "end_to_end_scenario_defined", "secondary_functions_excludable", "critical_external_dependencies", "technical_time_estimate", "user_value_demonstrable", "measurable_result_demonstrable", "scope_limitation_required", "deliverable_type", "limited_prototype_feasible_within_3_months", "standalone_useful_scope_possible"],
  F5: ["primary_kpi_defined", "kpi_count", "baseline_available", "baseline_collectable", "before_after_comparable", "measurement_method_defined", "baseline_partial", "measurement_mode", "indirect_indicators_used"],
};
function fail(): never { throw new ApplicationError("INCOMPLETE_SCORING_SPEC", "Расчёт отключён: scoring-конфигурация неполна или несовместима.", 422); }
function validateRequiredInputs(id: string, criterion: Criterion): void {
  const list = (value: unknown, expected: string[]) => {
    if (!Array.isArray(value) || value.length !== expected.length || new Set(value).size !== value.length ||
      value.some(field => typeof field !== "string" || !expected.includes(field) || !Object.hasOwn(criterion.inputs, field)) || expected.some(field => !value.includes(field))) fail();
  };
  if (requiredLists[id]) { list(criterion.required_inputs, requiredLists[id]); return; }
  // V3–V5 use the approved structured alternatives, not a flat array. Keep their YAML contract intact.
  const required = object(criterion.required_inputs);
  if (id === "V3") {
    list(required.VERIFIED_SCORE, ["manual_work_share_percent"]);
    const proxy = object(required.PRE_SCORE_PROXY);
    if (proxy.any_minimum_known !== 2) fail();
    list(proxy.from, ["paper_status", "digitalization_level", "machine_readability"]);
  } else if (id === "V4") {
    list(required.primary, ["standard_scenario_share_percent"]);
    list(required.qualitative_fallback, ["repeatability_level"]);
  } else if (id === "V5") {
    list(required.primary, ["problem_case_share_percent"]);
    const rates = object(required.alternative_rates);
    if (rates.any_minimum_known !== 1) fail();
    list(rates.from, ["return_rate", "error_rate", "delay_rate", "rework_rate", "complaint_rate"]);
    list(required.qualitative_fallback, ["problematicity_level"]);
  }
}

export function parseConfig(yaml: string): LoadedConfig {
  try {
    const document = parseDocument(yaml, { uniqueKeys: true });
    if (document.errors.length) fail();
    const c = document.toJS() as ScoringConfig;
    if (c?.methodology_version !== "1.1" || c.config_schema_version !== "1.0" || !c.normative_source?.sha256 || c.normative_source.file !== "SCORING_ENGINE_SPEC.md") fail();
    if (!c.criteria || Object.keys(c.criteria).sort().join() !== [...ids].sort().join()) fail();
    const ruleIds = new Set<string>();
    function bands(b: Band[] | undefined) {
      if (!Array.isArray(b) || !scoreSet(b.map(x => x.score))) fail();
      for (const x of b) if (!(typeof x.min === "number" || x.min === null) || !(typeof x.max === "number" || x.max === null) || typeof x.min_inclusive !== "boolean" || typeof x.max_inclusive !== "boolean") fail();
    }
    for (const id of ids) {
      const criterion = c.criteria[id];
      if (criterion.criterion_id !== id || typeof criterion.rule_id !== "string" || !criterion.rule_id || ruleIds.has(criterion.rule_id) || !criterion.required_inputs || !nonempty(criterion.inputs) || !nonempty(criterion.missing_behavior) || !nonempty(criterion.evidence_requirements)) fail();
      ruleIds.add(criterion.rule_id);
      validateRequiredInputs(id, criterion);
      for (const input of Object.values(criterion.inputs)) if (!input.type || !Object.hasOwn(input, "unit") || ["number", "integer"].includes(input.type) && !input.unit) fail();
      if (id.startsWith("V")) bands(criterion.thresholds);
      if (id === "V3") {
        bands(criterion.proxy?.rounding_bands);
        for (const field of ["paper_status", "digitalization_level", "machine_readability"]) if (!nonempty(criterion.proxy?.enum_mappings[field])) fail();
        if (!nonempty(criterion.actual_replaces_proxy)) fail();
      }
      if (["V4", "V5"].includes(id) && !scoreSet(Object.values(criterion.enum_mappings ?? {}))) fail();
      if (id === "F1") {
        bands(criterion.components?.coverage?.thresholds);
        if (!scoreSet(Object.values(criterion.components?.access?.enum_mappings ?? {}).filter(x => x !== null)) || !scoreSet(Object.values(criterion.components?.readiness?.enum_mappings ?? {}))) fail();
        if (criterion.components?.access?.enum_mappings?.unknown !== null || criterion.components.access.enum_mappings.confirmed_no_access !== 1) fail();
      }
      if (["F2", "F3", "F4", "F5"].includes(id) && (!Array.isArray(criterion.rules) || !scoreSet(criterion.rules.map(r => r.score)) || criterion.rules.some(r => !(r.all?.length || r.any?.length)))) fail();
    }
    for (const key of ["evidence_policy", "score_status_eligibility", "conflict_policy", "rule_overlap_policy", "interpretation_levels", "blocker_policy", "risk_policy", "completeness_validation", "engine_contract", "condition_dsl"]) if (!nonempty(c[key])) fail();
    const evidence = object(c.evidence_policy);
    for (const stage of ["PRE_SCORE", "INTERVIEW_SCORE", "VERIFIED_SCORE"]) if (!nonempty(evidence[stage])) fail();
    if (object(c.conflict_policy).affected_criterion_score !== null || object(c.rule_overlap_policy).selection !== "minimum_applicable_score" || object(c.engine_contract).llm_can_calculate_or_override_score !== false) fail();
    const d = c.derived_fact_rules?.annual_labor_hours;
    if (!d?.derivation_rule_id || !d.derivation_rule_version || !d.provenance_required || d.operation !== "multiply" || d.inputs?.length !== 2 || !d.output?.field || !d.output.unit) fail();
    const aggregation = c.axis_aggregation;
    if (!aggregation || aggregation.full_score?.operation !== "sum" || aggregation.full_score.if_any_criterion_null !== null || aggregation.known_sum?.operation !== "sum_non_null_criteria" || typeof aggregation.known_sum.empty_sum !== "number" || !aggregation.coverage?.expression || !aggregation.range || typeof aggregation.range.unknown_criterion_min !== "number" || typeof aggregation.range.unknown_criterion_max !== "number") fail();
    for (const axis of ["VALUE", "FEASIBILITY"] as const) {
      const expected = ids.filter(id => id.startsWith(axis === "VALUE" ? "V" : "F"));
      if (JSON.stringify(aggregation.axes?.[axis]?.criteria) !== JSON.stringify(expected) || aggregation.axes[axis].criterion_count !== expected.length || JSON.stringify(c.criterion_order?.[axis]) !== JSON.stringify(expected)) fail();
    }
    // Methodology's immutable two-axis domain, not an alternate set of thresholds.
    if (aggregation.full_score.max !== 25 || aggregation.full_score.min !== 5) fail();
    return { config: c, yaml, checksum: sha256(yaml) };
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return fail();
  }
}
export function loadConfig(root = process.cwd()): LoadedConfig {
  try {
    const loaded = parseConfig(readFileSync(path.join(root, "scoring_config_v1.1.yaml"), "utf8"));
    if (sha256(readFileSync(path.join(root, "SCORING_ENGINE_SPEC.md"))) !== loaded.config.normative_source.sha256) fail();
    return loaded;
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return fail();
  }
}
