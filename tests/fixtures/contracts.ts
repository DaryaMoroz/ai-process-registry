import type { ProcessCardView, RegistryProcessingView, SourceDetailsView, Slice02Criterion, Slice02Snapshot } from "../../src/shared/contracts";

// Opaque backend read models for FX-01–15. No formulas, thresholds or scoring config.
export const registryFixture: RegistryProcessingView = {
  registryVersionId: "upload-fixture", processingRunId: "fixture-run-1", fileName: "fixture.xlsm", fileExtension: "xlsm", fileSize: 12000,
  checksum: "a".repeat(64), profileId: "registry_mlh", mappingVersion: "1.0.0",
  availableSheets: [{ name: "Лист3" }, { name: "Другой" }], defaultSheet: "Лист3", selectedSheet: "Лист3", state: "VALID", canContinue: true,
  issues: [], selectableProcesses: [{ processId: "internal-process-1", officialProcessCode: "ОП.", processName: "Тестовый процесс", sourceRef: "fixture.xlsm / Лист3 / строка 14" }], error: null,
};
export const cardFixture: ProcessCardView = {
  processId: "internal-process-1", processName: "Тестовый процесс",
  sourceRegistry: { registryVersionId: "upload-fixture", fileName: "fixture.xlsm", sheetName: "Лист3", rowNumber: 14, officialProcessCode: "ОП.", sourceReferenceId: "registry-source" },
  scoreProcessing: { state: "AVAILABLE", error: null },
  activeScoreSnapshot: { scoreSnapshotId: "score-fixture", inputSnapshotId: "input-fixture", methodologyVersion: "1.1", stage: "PRE_SCORE",
    value: { maxScore: 25, fullScore: null, knownSum: 10, coverage: .4, range: [13, 25], criteria: [
      { id: "V1", label: "Частота процесса", score: 5, explanation: "Объяснение от backend", ruleId: "V1_FREQUENCY_v1.1", missingInputs: [], sourceReferenceIds: ["registry-source"] },
      { id: "V2", label: "Трудозатраты", score: 5, explanation: "Расчёт от backend", ruleId: "V2_LABOR_v1.1", missingInputs: [], sourceReferenceIds: ["derived-source"] },
      { id: "V3", label: "Доля ручной работы", score: null, explanation: "Нет данных", ruleId: "V3_MANUAL_WORK_v1.1", missingInputs: ["manual_work_share_percent"], sourceReferenceIds: [] },
    ] },
    feasibility: { maxScore: 25, fullScore: null, knownSum: 0, coverage: 0, range: [5, 25], criteria: [] },
  }, sourceFacts: [], dataQualityIssues: [{ id: "dq", code: "TEST_WARNING", severity: "WARNING", message: "Замечание к данным", sourceReferenceIds: ["registry-source"] }],
};
export const registrySource: SourceDetailsView = { sourceReferenceId: "registry-source", sourceType: "registry", factStatus: "Confirmed", sourceName: "fixture.xlsm", sheet: "Лист3", row: 14, column: "L", coordinate: "L14", excerptOrValue: 1440 };
export const derivedSource: SourceDetailsView = { sourceReferenceId: "derived-source", sourceType: "calculated", factStatus: "Derived", excerptOrValue: 25200,
  derivation: { ruleId: "DERIVE_ANNUAL_LABOR_HOURS_v1.1", ruleVersion: "1.1", trace: "Backend derivation trace", inputSourceReferenceIds: ["registry-source"] } };

// Genuine opaque ten-evaluator backend fixture, independent of the legacy card above.
function evaluated(id: string, label: string, ruleId: string, score: number | null, explanation: string, missingInputs: string[], sourceReferenceIds: string[], inputFactIds: string[]): Slice02Criterion {
  return { id, label, ruleId, score, explanation, missingInputs, sourceReferenceIds,
    reasonCode: score === null ? "MISSING_REQUIRED_INPUT" : "RULE_APPLIED", appliedRuleTrace: `Backend trace ${id}`,
    provenance: { scoreSnapshotId: "slice02-score-fixture", inputFactIds }, conflictIds: [], riskIds: [], blockerIds: [] };
}
export const slice02SnapshotFixture: Slice02Snapshot = {
  scoreSnapshotId: "slice02-score-fixture", inputSnapshotId: "slice02-input-fixture", methodologyVersion: "1.1", stage: "PRE_SCORE",
  resultContractVersion: "slice02.pre-score.v1", engineVersion: "slice-02-engine-1", scoringConfigVersion: "fixture-config-content-identity",
  conflicts: [], risks: [], blockers: [],
  value: { scoreSnapshotId: "slice02-score-fixture", maxScore: 25, fullScore: null, knownSum: 10, knownCount: 2, unknownCount: 3, coverage: .4, range: [13, 25], criteria: [
    evaluated("V1", "Частота процесса", "V1_FREQUENCY_v1.1", 5, "Объяснение от backend", [], ["registry-source"], ["fact-annual"]),
    evaluated("V2", "Трудозатраты", "V2_LABOR_v1.1", 5, "Расчёт от backend", [], ["derived-source"], ["fact-labor"]),
    evaluated("V3", "Доля ручной работы", "V3_MANUAL_WORK_v1.1", null, "Нет данных", ["manual_work_share_percent"], [], []),
    evaluated("V4", "Повторяемость", "V4_REPEATABILITY_v1.1", null, "Нет данных", ["standard_scenario_share_percent"], [], []),
    evaluated("V5", "Проблемность", "V5_PROBLEMATICITY_v1.1", null, "Нет данных", ["problem_case_share_percent"], [], []),
  ] },
  feasibility: { scoreSnapshotId: "slice02-score-fixture", maxScore: 25, fullScore: null, knownSum: 0, knownCount: 0, unknownCount: 5, coverage: 0, range: [5, 25], criteria: [
    evaluated("F1", "Доступность данных", "F1_DATA_AVAILABILITY_v1.1", null, "Нет данных", ["data_access_level"], [], []),
    evaluated("F2", "Простота интеграций", "F2_INTEGRATION_SIMPLICITY_v1.1", null, "Нет данных", ["integrations"], [], []),
    evaluated("F3", "Техническая реализуемость", "F3_TECHNICAL_FEASIBILITY_v1.1", null, "Нет данных", ["required_technologies"], [], []),
    evaluated("F4", "MVP за 3 месяца", "F4_MVP_3_MONTHS_v1.1", null, "Нет данных", ["mvp_scope_defined"], [], []),
    evaluated("F5", "Измеримость результата", "F5_MEASURABILITY_v1.1", null, "Нет данных", ["primary_kpi_defined"], [], []),
  ] },
};
export const slice02CardFixture: ProcessCardView = { ...cardFixture, activeScoreSnapshot: slice02SnapshotFixture,
  sourceFacts: [{ label: "Факт реестра", value: 1440, factStatus: "Confirmed", sourceReferenceIds: ["registry-source"] }] };
