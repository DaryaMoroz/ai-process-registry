import type { ScoreAxisViewModel, ScoreCriterionViewModel, ScoreConcernViewModel, Slice02Criterion } from "@/shared/contracts";
import { RESULT_CONTRACT_VERSION } from "@/shared/contracts";
import { isSlice02Snapshot } from "@/shared/scoreContract";
import type { CriterionTrace, Fact, FactValue, InputSnapshot, ScoreSnapshot, SourceReference } from "../domain";
import { sha256 } from "../identity";
import { ApplicationError } from "../errors";
import { ownValue } from "../lookup";
import { parseConfig, type Band, type ScoringConfig, type InputDefinition, type Criterion } from "./config";
import { conditionFields, evaluateCondition } from "./conditions";

export const ENGINE_VERSION = "slice-02-engine-1";
const labels: Record<string, string> = { V1: "Частота процесса", V2: "Трудозатраты", V3: "Доля ручной работы", V4: "Повторяемость", V5: "Проблемность", F1: "Доступность данных", F2: "Простота интеграций", F3: "Техническая реализуемость", F4: "MVP за 3 месяца", F5: "Измеримость результата" };
export function bandScore(value: number, bands: Band[]): Band | null {
  return bands.find(b => (b.min === null || (b.min_inclusive ? value >= b.min : value > b.min)) && (b.max === null || (b.max_inclusive ? value <= b.max : value < b.max))) ?? null;
}
export function eligibleForPre(fact: Fact, all: Fact[], seen = new Set<string>()): boolean {
  if (fact.value === null || !fact.sourceReferenceIds.length || seen.has(fact.factId)) return false;
  if (fact.factStatus === "Confirmed") return fact.sourceType === "registry";
  if (fact.factStatus !== "Derived" || fact.sourceType !== "calculated" || !fact.derivation?.ruleId || !fact.derivation.ruleVersion || !fact.derivation.inputFactIds.length) return false;
  const next = new Set(seen).add(fact.factId);
  return fact.derivation.inputFactIds.every(id => {
    const input = all.find(f => f.factId === id);
    return !!input && input.analysisUnitId === fact.analysisUnitId && eligibleForPre(input, all, next);
  });
}
export function excludedReason(fact: Fact): string {
  if (fact.value === null) return "MISSING_REQUIRED_INPUT";
  if (fact.factStatus === "Unknown") return "UNKNOWN_INPUT";
  if (fact.factStatus !== "Confirmed" && fact.factStatus !== "Derived") return "UNCONFIRMED_INPUT";
  return "INELIGIBLE_EVIDENCE";
}
export function aggregate(criteria: ScoreCriterionViewModel[], config: ScoringConfig, axis: "VALUE" | "FEASIBILITY", scoreSnapshotId?: string): ScoreAxisViewModel {
  const policy = config.axis_aggregation, known = criteria.filter(c => c.score !== null);
  const knownSum = known.reduce((sum, c) => sum + c.score!, policy.known_sum.empty_sum);
  const total = policy.axes[axis].criterion_count, missing = total - known.length;
  return { scoreSnapshotId, knownCount: known.length, unknownCount: missing, maxScore: policy.full_score.max,
    fullScore: missing === 0 ? knownSum : null, knownSum, coverage: known.length / total,
    range: [knownSum + missing * policy.range.unknown_criterion_min, knownSum + missing * policy.range.unknown_criterion_max], criteria };
}
function validValue(fact: Fact, def: InputDefinition): boolean {
  const value = fact.value;
  if (def.unit !== null && fact.unit !== def.unit) return false;
  if (def.type === "number" || def.type === "integer") return typeof value === "number" && Number.isFinite(value) &&
    (def.type !== "integer" || Number.isInteger(value)) && (def.valid_min === undefined || value >= def.valid_min) && (def.valid_max === undefined || value <= def.valid_max);
  if (def.type === "boolean") return typeof value === "boolean";
  if (def.type === "enum") return typeof value === "string" && (!def.allowed || def.allowed.includes(value));
  if (def.type !== "array" || !Array.isArray(value)) return false;
  return value.every(item => !def.item_schema || item !== null && typeof item === "object" && !Array.isArray(item) && Object.entries(def.item_schema).every(([key, field]) => {
    if (!Object.hasOwn(item, key)) return false;
    const member = item[key];
    if (member === null) return field.nullable === true;
    if (field.type === "boolean") return typeof member === "boolean";
    return typeof member === "string" && !!member.trim() && (!field.allowed || field.allowed.includes(member));
  }));
}
type Selection = { fact?: Fact; evidence: Fact[]; reason: string | null; conflict: boolean };
function select(input: InputSnapshot, field: string, def?: InputDefinition, confirmedOnly = false): Selection {
  const candidates = input.facts.filter(f => f.analysisUnitId === input.analysisUnitId && f.field === field && eligibleForPre(f, input.facts) && (!confirmedOnly || f.factStatus === "Confirmed"));
  const conflict = input.conflictFields.includes(field) || new Set(candidates.map(f => JSON.stringify(f.value))).size > 1;
  if (conflict) return { evidence: candidates, reason: "CONFIRMED_SOURCE_CONFLICT", conflict: true };
  const fact = candidates[0];
  if (fact && (!def || validValue(fact, def))) return { fact, evidence: [fact], reason: null, conflict: false };
  const excluded = input.facts.find(f => f.analysisUnitId === input.analysisUnitId && f.field === field);
  return { evidence: [], conflict: false, reason: fact ? "INVALID_INPUT" : excluded ? confirmedOnly && excluded.factStatus === "Derived" ? "UNCONFIRMED_INPUT" : excludedReason(excluded) : ownValue(input.excludedInputReasons ?? {}, field) ?? "MISSING_REQUIRED_INPUT" };
}
export function assertPublishable(result: ScoreSnapshot, input: InputSnapshot): void {
  const invalid = () => { throw new ApplicationError("INVALID_SCORE_RESULT", "Результат расчёта не соответствует контракту.", 422); };
  if (!isSlice02Snapshot(result) || result.inputSnapshotId !== input.inputSnapshotId || result.analysisUnitId !== input.analysisUnitId || result.methodologyVersion !== input.methodologyVersion ||
    result.configChecksum !== input.configChecksum || result.scoringConfigVersion !== `sha256:${input.configChecksum}` || result.engineVersion !== ENGINE_VERSION ||
    result.mappingVersion !== input.mappingVersion || result.processCardVersion !== input.cardVersion) invalid();
  const { config } = parseConfig(input.configYaml);
  for (const [name, axis] of [["VALUE", result.value], ["FEASIBILITY", result.feasibility]] as const) {
    const expected = aggregate(axis.criteria, config, name, result.scoreSnapshotId);
    for (const key of ["knownCount", "unknownCount", "knownSum", "coverage", "fullScore", "range"] as const) if (JSON.stringify(axis[key]) !== JSON.stringify(expected[key])) invalid();
  }
  if (result.criterionResults.length !== 10 || new Set(result.criterionResults.map(r => r.criterionId)).size !== 10) invalid();
  const facts = [...input.facts, ...result.derivedFacts];
  const sources = new Set([...facts.flatMap(f => f.sourceReferenceIds), ...result.sourceReferences.map(s => s.sourceReferenceId)]);
  for (const criterion of [...result.value.criteria, ...result.feasibility.criteria]) {
    const trace = result.criterionResults.find(r => r.criterionId === criterion.id);
    if (!trace || trace.ruleId !== config.criteria[criterion.id].rule_id || trace.score !== criterion.score || trace.appliedRule !== criterion.appliedRuleTrace ||
      criterion.ruleId !== trace.ruleId || criterion.provenance!.inputFactIds.some(id => !facts.some(f => f.factId === id && eligibleForPre(f, facts))) ||
      criterion.sourceReferenceIds.some(id => !sources.has(id)) || JSON.stringify(criterion.provenance!.inputFactIds) !== JSON.stringify([...new Set(trace.evidence.map(f => f.factId))])) invalid();
  }
  for (const concern of [...result.conflicts!, ...result.risks!, ...result.blockers!]) if (concern.sourceReferenceIds.some(id => !sources.has(id))) invalid();
}
// Pure ten-evaluator run. IDs/time/config arrive in the immutable input.
export function calculatePreScore(input: InputSnapshot): ScoreSnapshot {
  const { config, checksum } = parseConfig(input.configYaml);
  if (checksum !== input.configChecksum || config.methodology_version !== input.methodologyVersion) throw new ApplicationError("INPUT_VERSION_MISMATCH", "Версия входного snapshot не соответствует конфигурации.", 422);
  const snapshotId = sha256(`${input.inputSnapshotId}:${checksum}:${ENGINE_VERSION}:${RESULT_CONTRACT_VERSION}`);
  const results: CriterionTrace[] = [], derivedFacts: Fact[] = [], sourceReferences: SourceReference[] = [], criteria: Slice02Criterion[] = [];
  const conflicts: ScoreConcernViewModel[] = [], risks: ScoreConcernViewModel[] = [], blockers: ScoreConcernViewModel[] = [];
  function concern(kind: ScoreConcernViewModel["type"], code: string, affected: string[], evidence: Fact[], description: string): ScoreConcernViewModel {
    const item: ScoreConcernViewModel = { id: sha256(`${snapshotId}:${kind}:${code}:${affected.join(",")}`), scoreSnapshotId: snapshotId, type: kind, code, description,
      status: kind === "CONFLICT" ? "OPEN" : kind === "BLOCKER" ? "CONFIRMED" : "OPEN", affectedCriterionIds: affected,
      confirmationState: kind === "CONFLICT" || kind === "BLOCKER" ? "CONFIRMED" : "UNCONFIRMED", sourceReferenceIds: [...new Set(evidence.flatMap(f => f.sourceReferenceIds))] };
    const list = kind === "CONFLICT" ? conflicts : kind === "BLOCKER" ? blockers : risks;
    const existing = list.find(c => c.id === item.id);
    if (!existing) list.push(item);
    return existing ?? item;
  }
  function derive(ruleId: string, version: string, field: string, unit: string, value: number, inputs: Fact[], operation: string): Fact {
    if (!Number.isFinite(value)) throw new ApplicationError("NUMERIC_OVERFLOW", "Значение превышает поддерживаемый числовой диапазон.", 422);
    const factId = sha256(`${input.inputSnapshotId}:${ruleId}`), sourceId = `${factId}:source`;
    const trace = `${operation}(${inputs.map(f => `${f.field}=${f.value}`).join(", ")}) = ${value} ${unit}`;
    const fact: Fact = { factId, analysisUnitId: input.analysisUnitId, field, value, unit, factStatus: "Derived", sourceType: "calculated", sourceReferenceIds: [sourceId],
      derivation: { ruleId, ruleVersion: version, inputFactIds: inputs.map(f => f.factId), trace } };
    derivedFacts.push(fact);
    sourceReferences.push({ sourceReferenceId: sourceId, sourceType: "calculated", factStatus: "Derived", sourceName: field, excerptOrValue: value,
      derivation: { ruleId, ruleVersion: version, trace, inputSourceReferenceIds: inputs.flatMap(f => f.sourceReferenceIds) } });
    return fact;
  }
  for (const id of [...config.criterion_order.VALUE, ...config.criterion_order.FEASIBILITY]) {
    const rule: Criterion = config.criteria[id];
    let score: number | null = null, reasonCode = "MISSING_REQUIRED_INPUT", evidence: Fact[] = [], missing: string[] = [], conflict = false;
    const steps: string[] = [], selections = new Map<string, Selection>();
    for (const [field, def] of Object.entries(rule.inputs)) {
      const enumMapping = rule.enum_mappings ?? Object.values(rule.components ?? {}).find(component => component.input === field)?.enum_mappings;
      const definition = def.type === "enum" && enumMapping ? { ...def, allowed: Object.keys(enumMapping) } : def;
      const selection = select(input, field, definition, id === "V3" || id === "V4" || id === "V5" && (def.type === "enum" || field === "problem_case_share_percent"));
      selections.set(field, selection);
    }
    const get = (field: string) => selections.get(field)!;
    const accept = (field: string) => { const s = get(field); evidence.push(...s.evidence); if (s.conflict) conflict = true; return s.fact; };
    const threshold = (numeric: number) => {
      const band = bandScore(numeric, rule.thresholds!);
      score = band?.score ?? null; reasonCode = band ? "RULE_APPLIED" : id === "V1" && numeric === 0 ? "ZERO_OR_INACTIVE_PROCESS" : "NO_APPLICABLE_RULE";
      steps.push(JSON.stringify({ ruleId: rule.rule_id, input: numeric, band }));
    };
    const enumScore = (field: string): number | null => {
      const f = accept(field); const value = typeof f?.value === "string" ? ownValue(rule.enum_mappings ?? {}, f.value) : undefined;
      return typeof value === "number" ? value : null;
    };
    if (id === "V1" || id === "V2" || id === "V3") {
      const fields = rule.required_inputs as string[];
      fields.forEach(field => { if (!accept(field) && !get(field).conflict) missing.push(field); });
      if (!missing.length && !conflict) {
        let numeric = Number(get(fields[0]).fact!.value);
        if (id === "V2") {
          const d = config.derived_fact_rules.annual_labor_hours, inputs = d.inputs.map(i => get(i.field).fact!);
          numeric = inputs.reduce((p, f) => p * Number(f.value), 1);
          evidence.push(derive(d.derivation_rule_id, d.derivation_rule_version, d.output.field, d.output.unit, numeric, inputs, d.operation));
          const policy = rule.semantic_verification as { input_flag: string; pre_score_allowed_when_flagged: boolean };
          const flagged = select(input, policy.input_flag, { type: "boolean", unit: null }, true);
          if (flagged.fact?.value === true) {
            evidence.push(flagged.fact);
            concern("RISK", "RISK_REQUIRES_VERIFICATION", [id], [flagged.fact], "Требуется подтвердить, что трудозатраты означают активные человеко-часы. PRE-SCORE сохранён.");
          }
        }
        threshold(numeric);
      } else reasonCode = conflict ? "CONFIRMED_SOURCE_CONFLICT" : get(missing[0]).reason!;
    } else if (id === "V4" || id === "V5") {
      const primary = id === "V4" ? "standard_scenario_share_percent" : "problem_case_share_percent";
      const qualitative = id === "V4" ? "repeatability_level" : "problematicity_level";
      const quantitative = accept(primary);
      if (quantitative) {
        threshold(Number(quantitative.value));
        if (id === "V4") { const alternative = enumScore(qualitative); if (alternative !== null && alternative !== score) conflict = true; }
      } else if (id === "V5") {
        const d = config.derived_fact_rules.problem_proxy as { derivation_rule_id: string; derivation_rule_version: string; inputs: string[]; minimum_known_inputs: number; output: { field: string; unit: string }; operation: string };
        const inputs = d.inputs.map(field => accept(field)).filter((f): f is Fact => !!f);
        if (inputs.length >= d.minimum_known_inputs) {
          const proxy = derive(d.derivation_rule_id, d.derivation_rule_version, d.output.field, d.output.unit, Math.max(...inputs.map(f => Number(f.value))), inputs, d.operation);
          evidence.push(proxy); threshold(Number(proxy.value));
        } else { score = enumScore(qualitative); reasonCode = score === null ? "MISSING_REQUIRED_INPUT" : "CONFIRMED_QUALITATIVE_RULE"; }
      } else { score = enumScore(qualitative); reasonCode = score === null ? "MISSING_REQUIRED_INPUT" : "CONFIRMED_QUALITATIVE_RULE"; }
      if (score === null && !conflict) missing = [...selections.entries()].filter(([, s]) => !s.fact && !s.conflict).map(([field]) => field);
      steps.push(JSON.stringify({ priority: rule.input_priority, selectedScore: score }));
    } else if (id === "F1") {
      const components = Object.values(rule.components!).map(component => {
        const f = accept(component.input);
        if (!f) { missing.push(component.input); return null; }
        const numeric = component.thresholds ? bandScore(Number(f.value), component.thresholds)?.score ?? null : typeof f.value === "string" ? ownValue(component.enum_mappings ?? {}, f.value) ?? null : null;
        if (numeric === null) missing.push(component.input);
        steps.push(JSON.stringify({ input: component.input, value: f.value, componentScore: numeric }));
        return numeric;
      });
      if (components.every((s): s is number => typeof s === "number")) { score = Math.min(...components); reasonCode = "WEAK_LINK_MINIMUM"; }
      else reasonCode = "MISSING_OR_UNKNOWN_COMPONENT";
    } else {
      const values = new Map<string, FactValue>();
      for (const field of rule.required_inputs as string[]) {
        const fact = accept(field);
        if (fact) values.set(field, fact.value); else if (!get(field).conflict) missing.push(field);
      }
      const decisions = rule.rules!.map(r => ({ score: r.score, decision: evaluateCondition(r, values) }));
      const applicable = decisions.filter(d => d.decision === true).map(d => d.score);
      score = applicable.length ? Math.min(...applicable) : null;
      reasonCode = applicable.length ? "MINIMUM_APPLICABLE_RULE" : "INSUFFICIENT_CONFIRMED_DATA";
      steps.push(JSON.stringify({ decisions, selection: config.rule_overlap_policy, selectedScore: score }));
      if (missing.length || decisions.some(d => d.decision === null)) concern("RISK", "RISK_REQUIRES_VERIFICATION", [id], evidence, "Ограничения неизвестны или требуют подтверждения; автоматический штраф не применяется.");
      if (decisions.some(d => d.score === 1 && d.decision === true) && typeof rule.blocker_on_confirmed_score_1_condition === "string") {
        // A confirmed rule condition can only create a confirmed blocker from Confirmed evidence.
        const one = rule.rules!.find(r => r.score === 1)!;
        const fields = conditionFields(one);
        const confirmed = new Map<string, FactValue>(fields.flatMap(field => { const s = select(input, field, rule.inputs[field], true); return s.fact && !s.conflict ? [[field, s.fact.value] as const] : []; }));
        if (evaluateCondition(one, confirmed) === true) concern("BLOCKER", rule.blocker_on_confirmed_score_1_condition, [id], fields.flatMap(field => get(field).evidence), "Подтверждено критическое ограничение по правилу " + rule.rule_id + ".");
        else concern("RISK", "RISK_REQUIRES_VERIFICATION", [id], evidence, "Потенциальное критическое ограничение требует подтверждения.");
      }
    }
    if (conflict) {
      score = null; reasonCode = "CONFIRMED_SOURCE_CONFLICT";
      concern("CONFLICT", reasonCode, [id], evidence, "Подтверждённые источники противоречат друг другу. Требуется решение человека.");
    }
    evidence = [...new Map(evidence.map(f => [f.factId, f])).values()];
    const explanation = conflict ? "Подтверждённые источники противоречат друг другу. Требуется решение человека."
      : score !== null ? `Оценка ${labels[id]}: ${score}. Применено правило ${rule.rule_id}.`
      : `Нет оценки. ${reasonCode === "ZERO_OR_INACTIVE_PROCESS" ? "Процесс неактивен или имеет нулевую частоту." : "Нет достаточных допустимых данных."}${missing.length ? " Требуются: " + missing.join(", ") + "." : ""}`;
    const appliedRule = JSON.stringify({ evaluator: id, reasonCode, inputs: evidence.map(f => ({ factId: f.factId, field: f.field, value: f.value })), missingInputs: missing, steps });
    results.push({ criterionId: id, ruleId: rule.rule_id, score, status: score === null ? "Unknown" : "Derived", evidence, appliedRule,
      methodologyVersion: config.methodology_version, missingFacts: missing, conflict, risks: [], blockers: [] });
    criteria.push({ id, label: labels[id], score, explanation, ruleId: rule.rule_id, reasonCode, appliedRuleTrace: appliedRule, missingInputs: missing,
      sourceReferenceIds: [...new Set(evidence.flatMap(f => f.sourceReferenceIds))], provenance: { scoreSnapshotId: snapshotId, inputFactIds: evidence.map(f => f.factId) },
      conflictIds: [], riskIds: [], blockerIds: [] });
  }
  // Process-level confirmed stop factors are distinct from criterion scores.
  for (const [code, rule] of Object.entries(config.blocker_policy.rules)) {
    const fields = [...new Set(conditionFields(rule.trigger))], values = new Map<string, FactValue>(), evidence: Fact[] = [];
    for (const field of fields) { const s = select(input, field, undefined, true); if (s.fact && !s.conflict) { values.set(field, s.fact.value); evidence.push(s.fact); } }
    const affected = rule.linked_criterion ? [rule.linked_criterion] : [];
    if (evaluateCondition(rule.trigger, values) === true) concern("BLOCKER", code, affected, evidence, "Подтверждено ограничение " + code + ".");
    else if (input.unconfirmedBlockerCodes?.includes(code) || fields.some(field => input.facts.some(f => f.field === field && f.value !== null && (f.factStatus !== "Confirmed" || !eligibleForPre(f, input.facts))))) {
      concern("RISK", "RISK_REQUIRES_VERIFICATION", affected, [], "Возможное ограничение требует проверки: " + code + ".");
    }
  }
  for (const criterion of criteria) {
    criterion.conflictIds = conflicts.filter(c => c.affectedCriterionIds.includes(criterion.id)).map(c => c.id);
    criterion.riskIds = risks.filter(c => c.affectedCriterionIds.includes(criterion.id)).map(c => c.id);
    criterion.blockerIds = blockers.filter(c => c.affectedCriterionIds.includes(criterion.id)).map(c => c.id);
    const trace = results.find(r => r.criterionId === criterion.id)!;
    trace.risks = criterion.riskIds; trace.blockers = criterion.blockerIds;
  }
  const result: ScoreSnapshot = {
    scoreSnapshotId: snapshotId, inputSnapshotId: input.inputSnapshotId, methodologyVersion: config.methodology_version, stage: "PRE_SCORE",
    resultContractVersion: RESULT_CONTRACT_VERSION, engineVersion: ENGINE_VERSION, scoringConfigVersion: `sha256:${checksum}`,
    analysisUnitId: input.analysisUnitId, configChecksum: checksum, configVersion: input.configVersion, mappingVersion: input.mappingVersion,
    calculatedAt: input.createdAt, processCardVersion: input.cardVersion, conflicts, risks, blockers,
    value: aggregate(criteria.filter(c => config.criterion_order.VALUE.includes(c.id)), config, "VALUE", snapshotId),
    feasibility: aggregate(criteria.filter(c => config.criterion_order.FEASIBILITY.includes(c.id)), config, "FEASIBILITY", snapshotId),
    criterionResults: results, derivedFacts, sourceReferences,
  };
  assertPublishable(result, input);
  return result;
}
