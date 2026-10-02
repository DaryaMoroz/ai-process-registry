import type { ActiveScoreSnapshot, DataQualityIssueViewModel, FactStatus, ProcessCardView, RegistryProcessingView, SourceDetailsView, SourceType, Value } from "@/shared/contracts";
import type { ParsedCell } from "./registry/parser";

export type SourceCell = ParsedCell & {
  sourceCellId: string; sourceRowId: string; officialHeader: string; canonicalField: string;
  normalizedValue: Value; normalizationStatus: string; mappingVersion: string;
};
export type RowType = "PROCESS" | "GROUP_HEADER" | "AGGREGATE" | "TOTAL" | "EMPTY" | "UNKNOWN";
export type SourceRow = {
  sourceRowId: string; registryVersionId: string; sheetName: string; excelRowNumber: number;
  rowType: RowType; scoringEligible: boolean; classificationRuleId: string; classificationEvidence: string[];
  genericRowType: RowType; genericClassificationEvidence: string[]; classificationOrigin: "PROFILE" | "GENERIC";
  mappingVersion: string; cells: SourceCell[]; fingerprint: string | null; fingerprintVersion: string;
};
export type DQIssue = DataQualityIssueViewModel & {
  registryVersionId: string; sheet: string; row: number | null; coordinate: string | null;
  rawEvidence: Value; mappingVersion: string; status: "OPEN";
};
export type Fact = {
  factId: string; analysisUnitId: string; field: string; value: Value; unit: string | null;
  factStatus: FactStatus; sourceType: SourceType; sourceReferenceIds: string[];
  derivation?: { ruleId: string; ruleVersion: string; inputFactIds: string[]; trace: string };
};
export type SourceReference = SourceDetailsView & {
  registryVersionId?: string; sourceRowId?: string; sourceCellId?: string; mappingVersion?: string;
  rawValue?: Value; formula?: string | null; cachedValue?: Value; normalizedValue?: Value;
  formulaMetadata?: ParsedCell["formulaMetadata"];
  valueOrigin?: "literal" | "formula_cached_value";
};
export type AnalysisUnit = {
  analysisUnitId: string; processId: string; sourceRowId: string; unitType: "PRIMARY";
  parentAnalysisUnitId: null; name: string; status: "ACTIVE"; scoringEligible: true;
};
export type InputSnapshot = {
  inputSnapshotId: string; analysisUnitId: string; methodologyVersion: string; configVersion: string;
  configChecksum: string; configYaml: string; mappingVersion: string; cardVersion: number;
  createdAt: string; facts: Fact[]; conflictFields: string[];
};
export type CriterionTrace = {
  criterionId: string; ruleId: string; score: number | null; status: FactStatus;
  evidence: Fact[]; appliedRule: string; methodologyVersion: string; missingFacts: string[];
  conflict: boolean; risks: string[]; blockers: string[];
};
export type ScoreSnapshot = ActiveScoreSnapshot & {
  analysisUnitId: string; configChecksum: string; configVersion: string; mappingVersion: string;
  calculatedAt: string; processCardVersion: number; engineVersion: string;
  criterionResults: CriterionTrace[]; derivedFacts: Fact[]; sourceReferences: SourceReference[];
};
export type ScoreAttempt = {
  attemptId: string; inputSnapshotId: string | null; state: ProcessCardView["scoreProcessing"]["state"];
  error: ProcessCardView["scoreProcessing"]["error"]; createdAt: string; finishedAt: string | null;
};
export type ProcessRecord = {
  processId: string; sourceRowId: string; registryVersionId: string; sheetName: string;
  cardVersion: number; createdAt: string; analysisUnit: AnalysisUnit; facts: Fact[]; issues: DQIssue[];
  sourceReferences: SourceReference[]; attempts: ScoreAttempt[]; inputSnapshots: InputSnapshot[];
  scoreSnapshots: ScoreSnapshot[]; activeScoreSnapshotId: string | null;
};
export type RegistryRecord = {
  view: RegistryProcessingView; createdAt: string; runId: string | null;
  sheets: Record<string, { rows: SourceRow[]; processIds: string[]; issues: DQIssue[]; sources: SourceReference[] }>;
};
export type AuditEvent = { id: string; type: string; entityId: string; timestamp: string; actor: "local_user" | "system"; metadata: Record<string, unknown> };
export type Database = { schemaVersion: 1; registries: Record<string, RegistryRecord>; processes: Record<string, ProcessRecord>; audit: AuditEvent[] };
