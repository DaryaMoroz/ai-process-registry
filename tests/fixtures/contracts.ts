import type { ProcessCardView, RegistryProcessingView, SourceDetailsView } from "../../src/shared/contracts";

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
