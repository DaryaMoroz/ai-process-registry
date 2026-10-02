import type { ScoreAxisViewModel, ScoreCriterionViewModel } from "@/shared/contracts";
import type { CriterionTrace, Fact, InputSnapshot, ScoreSnapshot, SourceReference } from "../domain";
import { sha256 } from "../identity";
import { ApplicationError } from "../errors";
import { parseConfig, type Band, type ScoringConfig } from "./config";

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
    const input = all.find(f => f.factId === id); return !!input && eligibleForPre(input, all, next);
  });
}
export function aggregate(criteria: ScoreCriterionViewModel[], config: ScoringConfig, axis: "VALUE" | "FEASIBILITY"): ScoreAxisViewModel {
  const policy = config.axis_aggregation;
  const known = criteria.filter(c => c.score !== null);
  const knownSum = known.reduce((sum, c) => sum + c.score!, policy.known_sum.empty_sum);
  const total = policy.axes[axis].criterion_count;
  const missing = total - known.length;
  return { maxScore: policy.full_score.max, fullScore: missing === 0 ? knownSum : null, knownSum,
    coverage: known.length / total,
    range: [knownSum + missing * policy.range.unknown_criterion_min, knownSum + missing * policy.range.unknown_criterion_max], criteria };
}

// Pure function. Time, IDs and the exact validated methodology arrive in an immutable input.
export function calculatePreScore(input: InputSnapshot): ScoreSnapshot {
  const { config, checksum } = parseConfig(input.configYaml);
  if (checksum !== input.configChecksum || config.methodology_version !== input.methodologyVersion) throw new ApplicationError("INPUT_VERSION_MISMATCH", "Версия входного snapshot не соответствует конфигурации.", 422);
  const facts = input.facts.filter(f => f.analysisUnitId === input.analysisUnitId && eligibleForPre(f, input.facts));
  const results: CriterionTrace[] = [], derivedFacts: Fact[] = [], sourceReferences: SourceReference[] = [];
  const criteria: ScoreCriterionViewModel[] = [];
  for (const id of [...config.criterion_order.VALUE, ...config.criterion_order.FEASIBILITY]) {
    const rule = config.criteria[id];
    let score: number | null = null;
    let evidence: Fact[] = [];
    const missing: string[] = [];
    let conflict = false;
    let explanation = "Критерий не рассчитывается в первом slice.";
    let appliedRule = "NOT_IMPLEMENTED_IN_SLICE_01";
    if (id === "V1" || id === "V2") {
      const required = rule.required_inputs as string[];
      for (const field of required) {
        const available = facts.filter(f => f.field === field);
        const def = rule.inputs[field];
        if (input.conflictFields.includes(field) || new Set(available.map(f => JSON.stringify(f.value))).size > 1) { conflict = true; evidence.push(...available); continue; }
        const fact = available[0];
        const value = fact?.value;
        if (!fact || typeof value !== "number" || !Number.isFinite(value) || def.type === "integer" && !Number.isInteger(value) || def.valid_min !== undefined && value < def.valid_min || def.valid_max !== undefined && value > def.valid_max) missing.push(field);
        else evidence.push(fact);
      }
      if (conflict) { explanation = "Подтверждённые источники противоречат друг другу. Требуется решение человека."; appliedRule = "CONFIRMED_SOURCE_CONFLICT"; }
      else if (missing.length) { explanation = `Недостаточно допустимых данных: ${missing.join(", ")}.`; appliedRule = "MISSING_OR_INADMISSIBLE_INPUT"; }
      else {
        let numeric = Number(evidence[0].value);
        if (id === "V2") {
          const derivation = config.derived_fact_rules.annual_labor_hours;
          const inputs = derivation.inputs.map(d => evidence.find(f => f.field === d.field)!);
          numeric = inputs.reduce((product, f) => product * Number(f.value), 1);
          if (!Number.isFinite(numeric)) throw new ApplicationError("NUMERIC_OVERFLOW", "Трудозатраты превышают поддерживаемый числовой диапазон.", 422);
          const factId = sha256(`${input.inputSnapshotId}:${derivation.derivation_rule_id}`);
          const sourceId = `${factId}:source`;
          const trace = `${inputs.map(f => `${f.field}=${f.value}`).join(" × ")} = ${numeric} ${derivation.output.unit}`;
          const derived: Fact = { factId, analysisUnitId: input.analysisUnitId, field: derivation.output.field, value: numeric,
            unit: derivation.output.unit, factStatus: "Derived", sourceType: "calculated", sourceReferenceIds: [sourceId],
            derivation: { ruleId: derivation.derivation_rule_id, ruleVersion: derivation.derivation_rule_version, inputFactIds: inputs.map(f => f.factId), trace } };
          derivedFacts.push(derived);
          sourceReferences.push({ sourceReferenceId: sourceId, sourceType: "calculated", factStatus: "Derived", sourceName: "Годовые трудозатраты", excerptOrValue: numeric,
            derivation: { ruleId: derivation.derivation_rule_id, ruleVersion: derivation.derivation_rule_version, trace, inputSourceReferenceIds: inputs.flatMap(f => f.sourceReferenceIds) } });
          evidence = [...evidence, derived];
        }
        const band = bandScore(numeric, rule.thresholds!);
        score = band?.score ?? null;
        appliedRule = band ? JSON.stringify({ ruleId: rule.rule_id, input: numeric, band }) : id === "V1" && numeric === 0 ? "ZERO_OR_INACTIVE_PROCESS" : "NO_APPLICABLE_BAND";
        explanation = band ? `${id === "V1" ? "Экземпляров в год" : "Человеко-часов в год"}: ${numeric}. Балл по правилу ${rule.rule_id}: ${score}.` : "Значение не позволяет назначить балл по утверждённому правилу.";
      }
    }
    const trace: CriterionTrace = { criterionId: id, ruleId: rule.rule_id, score, status: score === null ? "Unknown" : "Derived", evidence, appliedRule,
      methodologyVersion: config.methodology_version, missingFacts: missing, conflict, risks: [], blockers: [] };
    results.push(trace);
    criteria.push({ id, label: labels[id], score, explanation, ruleId: rule.rule_id, missingInputs: missing, sourceReferenceIds: [...new Set(evidence.flatMap(f => f.sourceReferenceIds))] });
  }
  return {
    scoreSnapshotId: sha256(`${input.inputSnapshotId}:${checksum}:slice-01-engine-1`), inputSnapshotId: input.inputSnapshotId,
    methodologyVersion: config.methodology_version, stage: "PRE_SCORE", analysisUnitId: input.analysisUnitId,
    configChecksum: checksum, configVersion: input.configVersion, mappingVersion: input.mappingVersion,
    calculatedAt: input.createdAt, processCardVersion: input.cardVersion, engineVersion: "slice-01-engine-1",
    value: aggregate(criteria.filter(c => config.criterion_order.VALUE.includes(c.id)), config, "VALUE"),
    feasibility: aggregate(criteria.filter(c => config.criterion_order.FEASIBILITY.includes(c.id)), config, "FEASIBILITY"),
    criterionResults: results, derivedFacts, sourceReferences,
  };
}
