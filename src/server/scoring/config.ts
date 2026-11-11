import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { ApplicationError } from "../errors";
import { sha256 } from "../identity";

export type Band = { score: number; min: number | null; max: number | null; min_inclusive: boolean; max_inclusive: boolean };
export type Condition = { all: Condition[] } | { any: Condition[] } | {
  path: string; op: string; value?: unknown; min?: number; max?: number; filter?: Record<string, unknown>;
};
export type InputDefinition = {
  type: string; unit: string | null; valid_min?: number; valid_max?: number; allowed?: string[];
  item_schema?: Record<string, { type: string; required: boolean; nullable?: boolean; allowed?: string[] }>;
};
export type Criterion = {
  criterion_id: string; result_key: string; axis: string; rule_id: string;
  required_inputs: unknown; inputs: Record<string, InputDefinition>;
  thresholds?: Band[]; rules?: ({ score: number } & Condition)[];
  enum_mappings?: Record<string, number>;
  components?: Record<string, { input: string; thresholds?: Band[]; enum_mappings?: Record<string, number | null> }>;
  missing_behavior: Record<string, unknown>; evidence_requirements: Record<string, unknown>;
  [key: string]: unknown;
};
export type ScoringConfig = {
  config_schema_version: string; methodology_version: string; normative_source: { file: string; sha256: string };
  criteria: Record<string, Criterion>; criterion_order: { VALUE: string[]; FEASIBILITY: string[] };
  derived_fact_rules: { annual_labor_hours: { derivation_rule_id: string; derivation_rule_version: string; operation: string; expression: string; inputs: { field: string; unit: string }[]; output: { field: string; unit: string }; provenance_required: boolean }; [key: string]: unknown };
  blocker_policy: { score_effect: string; unconfirmed_blocker_becomes: string; rules: Record<string, { trigger: Condition; evidence_status_required: string; linked_criterion?: string }> };
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
  V3: ["manual_work_share_percent"],
  F1: ["data_coverage_percent", "data_access_level", "data_readiness_level"],
  F2: ["integrations", "complex_approvals_required"],
  F3: ["required_technologies", "critical_competencies", "ml_cv_ds_required", "rd_required", "technical_dependencies", "technical_risks", "solution_feasible", "poc_required"],
  F4: ["mvp_scope_defined", "end_to_end_scenario_defined", "secondary_functions_excludable", "critical_external_dependencies", "technical_time_estimate", "user_value_demonstrable", "measurable_result_demonstrable", "scope_limitation_required", "deliverable_type", "limited_prototype_feasible_within_3_months", "standalone_useful_scope_possible"],
  F5: ["primary_kpi_defined", "kpi_count", "baseline_available", "baseline_collectable", "before_after_comparable", "measurement_method_defined", "baseline_partial", "measurement_mode", "indirect_indicators_used"],
};
// Frozen input kinds, not scoring thresholds or fallback values.
const booleans = (fields: string[]) => Object.fromEntries(fields.map(field => [field, "boolean"]));
const inputKinds: Record<string, Record<string, string>> = {
  V1: { annual_instances: "integer" },
  V2: { annual_instances: "number", hours_per_instance: "number", annual_labor_hours: "number" },
  V3: { manual_work_share_percent: "number" },
  V4: { standard_scenario_share_percent: "number", repeatability_level: "enum" },
  V5: { ...Object.fromEntries(["problem_case_share_percent", "return_rate", "error_rate", "delay_rate", "rework_rate", "complaint_rate"].map(field => [field, "number"])), problematicity_level: "enum" },
  F1: { data_coverage_percent: "number", data_access_level: "enum", data_readiness_level: "enum" },
  F2: { integrations: "array", complex_approvals_required: "boolean" },
  F3: { ...booleans(requiredLists.F3), required_technologies: "array", critical_competencies: "array", technical_dependencies: "array", technical_risks: "array" },
  F4: { ...booleans(requiredLists.F4), critical_external_dependencies: "array", technical_time_estimate: "number", deliverable_type: "enum" },
  F5: { ...booleans(requiredLists.F5), kpi_count: "integer", measurement_mode: "enum" },
};
const itemKinds: Record<string, Record<string, string>> = {
  integrations: { system_name: "string", mechanism: "string", ...booleans(["critical", "api_documented", "access_confirmed", "custom_development_required", "approval_required", "available", "closed_system", "minor_adaptation_required", "mechanism_technically_understood", "realistic_workaround_available", "permitted_integration_method_available"]) },
  required_technologies: { name: "string", ...booleans(["standard_stack", "understood_by_team", "new_learning_required"]) },
  critical_competencies: { name: "string", ...booleans(["available_in_team", "realistic_closure_available"]) },
  technical_dependencies: { name: "string", ...booleans(["controlled", "uncertain_research_outcome"]) },
  technical_risks: { description: "string", severity: "enum" },
};
function fail(): never { throw new ApplicationError("INCOMPLETE_SCORING_SPEC", "Расчёт отключён: scoring-конфигурация неполна или несовместима.", 422); }
const keysAre = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const choices = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === "string" && v.trim().length > 0) && new Set(value).size === value.length;
function conditionInputs(criterion: Criterion): Criterion["inputs"] {
  return Object.fromEntries(Object.entries(criterion.inputs).map(([field, input]) => {
    const mapping = criterion.enum_mappings ?? Object.values(criterion.components ?? {}).find(c => c.input === field)?.enum_mappings;
    return [field, input.type === "enum" && mapping ? { ...input, allowed: Object.keys(mapping) } : input];
  }));
}
function validateInputKinds(id: string, criterion: Criterion): void {
  const expected = inputKinds[id];
  if (Object.keys(criterion.inputs).sort().join() !== Object.keys(expected).sort().join()) fail();
  for (const [field, input] of Object.entries(criterion.inputs)) {
    if (input.type !== expected[field] || !keysAre(object(input), ["type", "unit", "valid_min", "valid_max", "valid_min_inclusive", "valid_max_inclusive", "allowed", "derived", "item_schema"]) ||
      !(input.unit === null || typeof input.unit === "string" && input.unit.trim().length > 0)) fail();
    if (["boolean", "enum"].includes(input.type) && input.unit !== null) fail();
    if (["number", "integer", "array"].includes(input.type) && input.unit === null) fail();
    if (input.allowed !== undefined && (input.type !== "enum" || !choices(input.allowed))) fail();
    if (input.type === "enum" && !choices(conditionInputs(criterion)[field].allowed)) fail();
    for (const flag of ["valid_min_inclusive", "valid_max_inclusive", "derived"]) if (Object.hasOwn(input, flag) && object(input)[flag] !== true) fail();
    if (input.type !== "number" && input.type !== "integer" && ["valid_min", "valid_max", "valid_min_inclusive", "valid_max_inclusive", "derived"].some(key => Object.hasOwn(input, key))) fail();
    const expectedItems = Object.hasOwn(itemKinds, field) ? itemKinds[field] : undefined;
    if (!expectedItems) { if (Object.hasOwn(input, "item_schema")) fail(); continue; }
    if (Object.keys(input.item_schema ?? {}).sort().join() !== Object.keys(expectedItems).sort().join()) fail();
    for (const [member, schema] of Object.entries(input.item_schema!)) {
      if (schema.type !== expectedItems[member] || schema.required !== true || !keysAre(object(schema), ["type", "required", "nullable", "allowed"]) ||
        schema.nullable !== undefined && typeof schema.nullable !== "boolean" ||
        schema.type === "enum" && !choices(schema.allowed) || schema.type !== "enum" && schema.allowed !== undefined) fail();
    }
  }
}
function validateRequiredInputs(id: string, criterion: Criterion): void {
  const list = (value: unknown, expected: string[]) => {
    if (!Array.isArray(value) || value.length !== expected.length || new Set(value).size !== value.length ||
      value.some(field => typeof field !== "string" || !expected.includes(field) || !Object.hasOwn(criterion.inputs, field)) || expected.some(field => !value.includes(field))) fail();
  };
  if (Object.hasOwn(requiredLists, id)) { list(criterion.required_inputs, requiredLists[id]); return; }
  // V4/V5 retain their approved alternative inputs.
  const required = object(criterion.required_inputs);
  if (id === "V4") {
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
      if (!Array.isArray(b) || b.length !== 5 || !scoreSet(b.map(x => x.score))) fail();
      for (const x of b) if (!(typeof x.min === "number" && Number.isFinite(x.min) || x.min === null) || !(typeof x.max === "number" && Number.isFinite(x.max) || x.max === null) || typeof x.min_inclusive !== "boolean" || typeof x.max_inclusive !== "boolean" || x.min !== null && x.max !== null && x.min > x.max) fail();
    }
    const scalarOps = ["eq", "ne", "lt", "lte", "gt", "gte", "in", "is_null", "is_not_null"];
    const collectionOps = ["count_eq", "count_gte", "count_lte", "count_between", "all_items", "any_item", "count_items_eq", "count_items_gte", "count_items_lte"];
    const operandMatches = (schema: { type: string; allowed?: string[] }, value: unknown): boolean => {
      if (schema.type === "boolean") return typeof value === "boolean";
      if (schema.type === "number" || schema.type === "integer") return typeof value === "number" && Number.isFinite(value) && (schema.type !== "integer" || Number.isInteger(value));
      return typeof value === "string" && value.trim().length > 0 && (schema.type === "string" || schema.type === "enum" && !!schema.allowed?.includes(value));
    };
    const condition = (value: unknown, inputs: Criterion["inputs"], depth = 0, scored = false): void => {
      if (depth > 20 || !nonempty(value)) fail();
      const node = object(value);
      const wrapperKeys = scored ? ["score"] : [];
      if (Object.hasOwn(node, "all") || Object.hasOwn(node, "any")) {
        const children = node.all ?? node.any;
        if (!keysAre(node, [...wrapperKeys, Object.hasOwn(node, "all") ? "all" : "any"]) || !Array.isArray(children) || !children.length) fail();
        children.forEach(child => condition(child, inputs, depth + 1)); return;
      }
      if (typeof node.path !== "string" || !node.path || typeof node.op !== "string" || ![...scalarOps, ...collectionOps].includes(node.op)) fail();
      const parts = node.path.split(".");
      if (parts.length > 2 || parts.some(p => !/^[a-z][a-z0-9_]*$/i.test(p) || ["__proto__", "constructor", "prototype"].includes(p)) || !Object.hasOwn(inputs, parts[0])) fail();
      const input = inputs[parts[0]], member = parts[1];
      if (member !== undefined && (!Object.hasOwn(input.item_schema ?? {}, member) || input.type !== "array")) fail();
      const collection = collectionOps.includes(node.op), nullCheck = ["is_null", "is_not_null"].includes(node.op);
      const allowed = [...wrapperKeys, "path", "op", ...(collection ? ["filter"] : []), ...(node.op === "count_between" ? ["min", "max"] : nullCheck ? [] : ["value"])];
      if (!keysAre(node, allowed)) fail();
      if (collection) {
        if (input.type !== "array") fail();
        const itemOperation = ["all_items", "any_item"].includes(node.op);
        if (itemOperation && !member || !itemOperation && !node.op.startsWith("count_items_") && member) fail();
        if (node.op.startsWith("count_items_") && (member ? input.item_schema![member].type !== "boolean" : !nonempty(node.filter))) fail();
      } else if (member || input.type === "array" && !nullCheck) fail();
      if (node.op === "count_between") {
        if (!Number.isSafeInteger(node.min) || !Number.isSafeInteger(node.max) || Number(node.min) < 0 || Number(node.min) > Number(node.max)) fail();
      } else if (!nullCheck) {
        if (!Object.hasOwn(node, "value")) fail();
        const schema = member ? input.item_schema![member] : input;
        if (node.op.startsWith("count_")) { if (!Number.isSafeInteger(node.value) || Number(node.value) < 0) fail(); }
        else if (node.op === "in") { if (!Array.isArray(node.value) || !node.value.length || node.value.some(v => !operandMatches(schema, v))) fail(); }
        else if (!operandMatches(schema, node.value) || ["lt", "lte", "gt", "gte"].includes(node.op) && !["number", "integer"].includes(schema.type)) fail();
      }
      if (node.filter !== undefined) {
        if (!nonempty(node.filter)) fail();
        for (const [key, operand] of Object.entries(object(node.filter))) if (!Object.hasOwn(input.item_schema ?? {}, key) || !operandMatches(input.item_schema![key], operand)) fail();
      }
    };
    for (const id of ids) {
      const criterion = c.criteria[id];
      if (criterion.criterion_id !== id || criterion.axis !== (id.startsWith("V") ? "VALUE" : "FEASIBILITY") || typeof criterion.rule_id !== "string" || !criterion.rule_id || ruleIds.has(criterion.rule_id) || !criterion.required_inputs || !nonempty(criterion.inputs) || !nonempty(criterion.missing_behavior) || !nonempty(criterion.evidence_requirements) || criterion.evidence_requirements.inherit_stage_policy !== true) fail();
      ruleIds.add(criterion.rule_id);
      validateRequiredInputs(id, criterion);
      validateInputKinds(id, criterion);
      const missing = id === "V4" ? object(criterion.missing_behavior.if_no_quantitative_or_confirmed_enum)
        : id === "V5" ? object(criterion.missing_behavior.if_no_quantitative_proxy_or_confirmed_enum) : criterion.missing_behavior;
      if (missing.score !== null) fail();
      for (const input of Object.values(criterion.inputs)) {
        if (!["number", "integer", "boolean", "enum", "array"].includes(input.type) || !Object.hasOwn(input, "unit") || ["number", "integer"].includes(input.type) && !input.unit) fail();
        for (const bound of [input.valid_min, input.valid_max]) if (bound !== undefined && (typeof bound !== "number" || !Number.isFinite(bound))) fail();
        if (input.valid_min !== undefined && input.valid_max !== undefined && input.valid_min > input.valid_max) fail();
        if (input.type === "array" && id !== "F4" && !nonempty(input.item_schema)) fail();
        for (const item of Object.values(input.item_schema ?? {})) if (!["string", "boolean", "enum"].includes(item.type) || item.required !== true || item.type === "enum" && !item.allowed?.length) fail();
      }
      if (id.startsWith("V")) bands(criterion.thresholds);
      if (id === "V1" && (object(criterion.zero_behavior).score !== null || object(criterion.zero_behavior).data_quality_issue !== "ZERO_OR_INACTIVE_PROCESS")) fail();
      if (id === "V2") {
        const policy = object(criterion.semantic_verification);
        if (policy.input_flag !== "hours_per_instance_semantic_verification_required" || policy.pre_score_allowed_when_flagged !== true || criterion.derived_input !== "annual_labor_hours") fail();
      }
      if (id === "V3") {
        const selection = object(criterion.input_selection);
        if (Object.keys(criterion.inputs).join() !== "manual_work_share_percent" || selection.required_fact_status !== "Confirmed" || selection.field !== "manual_work_share_percent" || selection.fallback_allowed !== false || selection.stage_evidence_policy_required !== true || criterion.evidence_requirements.derived_input_allowed !== false || criterion.evidence_requirements.required_input_status !== "Confirmed" || Object.hasOwn(criterion, "proxy") || Object.hasOwn(criterion, "actual_replaces_proxy")) fail();
        for (const key of ["if_input_absent_or_null", "if_input_unknown", "if_input_not_confirmed", "if_input_invalid", "if_evidence_ineligible_for_stage"]) if (criterion.missing_behavior[key] !== true) fail();
        if (!nonempty(criterion.missing_behavior.reason_by_condition)) fail();
      }
      if (["V4", "V5"].includes(id)) {
        const keys = id === "V4" ? ["unique", "mostly_unique", "mixed", "mostly_standard", "standard"] : ["practically_none", "rare", "periodic", "frequent", "systemic"];
        const priority = id === "V4" ? ["confirmed_quantitative", "confirmed_qualitative_enum"] : ["confirmed_problem_case_share_percent", "derived_problem_proxy", "confirmed_qualitative_enum"];
        if (Object.keys(criterion.enum_mappings ?? {}).sort().join() !== keys.sort().join() || !scoreSet(Object.values(criterion.enum_mappings ?? {})) || criterion.qualitative_requires_confirmed !== true || JSON.stringify(criterion.input_priority) !== JSON.stringify(priority)) fail();
        if (id === "V4" && (object(criterion.contradiction_between_confirmed_inputs).score !== null || object(criterion.contradiction_between_confirmed_inputs).conflict !== true)) fail();
        if (id === "V5") {
          const proxy = object(criterion.alternative_rate_proxy);
          if (proxy.operation !== "max" || proxy.minimum_known_inputs !== 1 || proxy.fact_name !== "problem_proxy" || proxy.fact_status !== "Derived" || !Array.isArray(proxy.inputs) || [...proxy.inputs].sort().join() !== "complaint_rate,delay_rate,error_rate,return_rate,rework_rate") fail();
        }
      }
      if (id === "F1") {
        bands(criterion.components?.coverage?.thresholds);
        if (!scoreSet(Object.values(criterion.components?.access?.enum_mappings ?? {}).filter(x => x !== null)) || !scoreSet(Object.values(criterion.components?.readiness?.enum_mappings ?? {}))) fail();
        if (criterion.components?.access?.enum_mappings?.unknown !== null || criterion.components.access.enum_mappings.confirmed_no_access !== 1) fail();
        if (criterion.components.coverage.input !== "data_coverage_percent" || criterion.components.access.input !== "data_access_level" || criterion.components.readiness.input !== "data_readiness_level" || object(criterion.aggregation).operation !== "min" || criterion.missing_behavior.score !== null || criterion.missing_behavior.unknown_access_score !== null) fail();
      }
      if (["F2", "F3", "F4", "F5"].includes(id)) {
        if (!Array.isArray(criterion.rules) || !scoreSet(criterion.rules.map(r => r.score)) || criterion.rules.length !== 5 || criterion.overlap_policy_ref !== "rule_overlap_policy" || criterion.missing_behavior.score !== null || criterion.missing_behavior.unknown_constraint_does_not_reduce_score !== true || criterion.missing_behavior.create_risk !== "RISK_REQUIRES_VERIFICATION") fail();
        criterion.rules.forEach(rule => condition(rule, conditionInputs(criterion), 0, true));
      }
    }
    for (const key of ["evidence_policy", "score_status_eligibility", "conflict_policy", "rule_overlap_policy", "interpretation_levels", "blocker_policy", "risk_policy", "completeness_validation", "engine_contract", "condition_dsl"]) if (!nonempty(c[key])) fail();
    const evidence = object(c.evidence_policy);
    for (const stage of ["PRE_SCORE", "INTERVIEW_SCORE", "VERIFIED_SCORE"]) if (!nonempty(evidence[stage])) fail();
    const pre = object(evidence.PRE_SCORE);
    if (JSON.stringify(pre.allowed) !== JSON.stringify([{ status: "Confirmed", source_type: "registry" }, { status: "Derived", derived_only_from: [{ status: "Confirmed", source_type: "registry" }] }]) || object(object(c.score_status_eligibility).PRE_SCORE).only_registry_confirmed_and_registry_derived !== true) fail();
    if (object(c.conflict_policy).affected_criterion_score !== null || object(c.rule_overlap_policy).selection !== "minimum_applicable_score" || object(c.engine_contract).llm_can_calculate_or_override_score !== false) fail();
    if (object(c.condition_dsl).null_condition_result !== "unknown" || object(c.condition_dsl).unknown_condition_is_applicable !== false || JSON.stringify(object(c.condition_dsl).scalar_operators) !== JSON.stringify(scalarOps) || JSON.stringify(object(c.condition_dsl).collection_operators) !== JSON.stringify(collectionOps)) fail();
    const d = c.derived_fact_rules?.annual_labor_hours;
    if (!d?.derivation_rule_id || !d.derivation_rule_version || !d.provenance_required || d.operation !== "multiply" || d.inputs?.length !== 2 || d.inputs.map(i => i.field).sort().join() !== "annual_instances,hours_per_instance" || d.output?.field !== "annual_labor_hours" || d.output.unit !== "person_hours_per_year" || d.inputs.some(i => i.unit !== c.criteria.V2.inputs[i.field].unit)) fail();
    const problem = object(c.derived_fact_rules.problem_proxy);
    if (problem.operation !== "max" || !problem.derivation_rule_id || !problem.derivation_rule_version || problem.minimum_known_inputs !== 1 || problem.provenance_required !== true || !Array.isArray(problem.inputs) || [...problem.inputs].sort().join() !== "complaint_rate,delay_rate,error_rate,return_rate,rework_rate" || object(problem.output).field !== "problem_proxy" || object(problem.output).unit !== "percent") fail();
    const blockerCodes = ["NO_PROCESS_OWNER_OR_EXPERT", "CRITICAL_DATA_UNAVAILABLE", "LEGAL_INFOSEC_PDN_BLOCK", "CRITICAL_INTEGRATION_UNAVAILABLE", "NO_VIABLE_MVP_SCOPE", "EFFECT_NOT_MEASURABLE"];
    if (c.blocker_policy.score_effect !== "none" || c.blocker_policy.unconfirmed_blocker_becomes !== "RISK_REQUIRES_VERIFICATION" || Object.keys(c.blocker_policy.rules).sort().join() !== blockerCodes.sort().join()) fail();
    const blockerInputs = { ...Object.assign({}, ...Object.values(c.criteria).map(conditionInputs)),
      ...Object.fromEntries(["process_owner_or_expert_available", "critical_data_required", "legal_infosec_pdn_block", "critical_integration_unavailable", "no_viable_mvp_scope", "effect_not_measurable"].map(field => [field, { type: "boolean", unit: null }])) };
    for (const rule of Object.values(c.blocker_policy.rules)) { if (rule.evidence_status_required !== "Confirmed") fail(); condition(rule.trigger, blockerInputs); }
    const aggregation = c.axis_aggregation;
    if (!aggregation || aggregation.full_score?.operation !== "sum" || aggregation.full_score.if_any_criterion_null !== null || aggregation.known_sum?.operation !== "sum_non_null_criteria" || typeof aggregation.known_sum.empty_sum !== "number" || !aggregation.coverage?.expression || !aggregation.range || typeof aggregation.range.unknown_criterion_min !== "number" || typeof aggregation.range.unknown_criterion_max !== "number") fail();
    for (const axis of ["VALUE", "FEASIBILITY"] as const) {
      const expected = ids.filter(id => id.startsWith(axis === "VALUE" ? "V" : "F"));
      if (JSON.stringify(aggregation.axes?.[axis]?.criteria) !== JSON.stringify(expected) || aggregation.axes[axis].criterion_count !== expected.length || JSON.stringify(c.criterion_order?.[axis]) !== JSON.stringify(expected)) fail();
    }
    // Methodology's immutable two-axis domain, not an alternate set of thresholds.
    if (aggregation.full_score.max !== 25 || aggregation.full_score.min !== 5 || aggregation.known_sum.empty_sum !== 0 || aggregation.range.unknown_criterion_min !== 1 || aggregation.range.unknown_criterion_max !== 5) fail();
    return { config: c, yaml, checksum: sha256(yaml) };
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return fail();
  }
}
export function loadConfig(root = process.cwd()): LoadedConfig {
  try {
    const loaded = parseConfig(readFileSync(path.join(root, "scoring_config_v1.1.yaml"), "utf8"));
    // The approved document identity uses repository LF text; Windows checkout may use CRLF.
    if (sha256(readFileSync(path.join(root, "SCORING_ENGINE_SPEC.md"), "utf8").replaceAll("\r\n", "\n")) !== loaded.config.normative_source.sha256) fail();
    return loaded;
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return fail();
  }
}
