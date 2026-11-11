// Application read models: FRONTEND_SPEC_SLICE_01.md §17. No domain calculations.
export type FactStatus = "Confirmed" | "Derived" | "Inferred" | "Unknown";
export type SourceType = "registry" | "calculated" | "interview" | "document" | "system_data" | "llm_hypothesis";
export type ScoreStatus = "PRE_SCORE" | "INTERVIEW_SCORE" | "VERIFIED_SCORE";
export type Value = string | number | boolean | null;
export type SafeError = { code: string; message: string };
export type DataQualityIssueViewModel = {
  id: string;
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  field?: string | null;
  affectsScoring?: boolean | null;
  sourceReferenceIds: string[];
};
export type WorkbookMetadataResult = {
  registryVersionId: string;
  fileName: string;
  fileExtension: "xlsx" | "xlsm";
  fileSize: number;
  checksum: string;
  profileId: string;
  mappingVersion: string;
  availableSheets: { name: string }[];
  defaultSheet: string;
  selectedSheet: string;
  state: "READING";
};
export type RegistryProcessSummary = {
  processId: string;
  processName: string;
  sourceRef: string | null;
  officialProcessCode?: string | null;
};
export type RegistryProcessingView = Omit<WorkbookMetadataResult, "state"> & {
  processingRunId: string | null;
  state: "READING" | "VALID" | "WARNING" | "ERROR";
  canContinue: boolean;
  issues: DataQualityIssueViewModel[];
  selectableProcesses: RegistryProcessSummary[];
  error?: SafeError | null;
};
export type ScoreCriterionViewModel = {
  id: string;
  label: string;
  score: number | null;
  explanation: string | null;
  ruleId: string | null;
  missingInputs: string[];
  sourceReferenceIds: string[];
  reasonCode?: string;
  provenance?: { scoreSnapshotId: string; inputFactIds: string[] };
  appliedRuleTrace?: string;
  conflictIds?: string[];
  riskIds?: string[];
  blockerIds?: string[];
};
export type ScoreAxisViewModel = {
  scoreSnapshotId?: string;
  knownCount?: number;
  unknownCount?: number;
  maxScore: number;
  fullScore: number | null;
  knownSum: number;
  coverage: number;
  range: [number, number] | null;
  criteria: ScoreCriterionViewModel[];
};
export type ActiveScoreSnapshot = {
  resultContractVersion?: string;
  engineVersion?: string;
  scoringConfigVersion?: string;
  calculatedAt?: string;
  conflicts?: ScoreConcernViewModel[];
  risks?: ScoreConcernViewModel[];
  blockers?: ScoreConcernViewModel[];
  scoreSnapshotId: string;
  inputSnapshotId: string;
  methodologyVersion: string;
  stage: ScoreStatus;
  value: ScoreAxisViewModel;
  feasibility: ScoreAxisViewModel;
};
export const RESULT_CONTRACT_VERSION = "slice02.pre-score.v1";
export type ScoreConcernViewModel = {
  id: string; scoreSnapshotId: string; type: "CONFLICT" | "RISK" | "BLOCKER";
  code: string; description: string; status: string;
  affectedCriterionIds: string[];
  confirmationState: "CONFIRMED" | "UNCONFIRMED" | "UNKNOWN" | "NOT_APPLICABLE";
  sourceReferenceIds: string[]; severity?: string | null;
};
export type Slice02Criterion = ScoreCriterionViewModel & Required<Pick<ScoreCriterionViewModel,
  "reasonCode" | "provenance" | "appliedRuleTrace" | "conflictIds" | "riskIds" | "blockerIds">>;
export type Slice02Axis = Omit<ScoreAxisViewModel, "criteria"> & {
  scoreSnapshotId: string; knownCount: number; unknownCount: number;
  range: [number, number]; criteria: Slice02Criterion[];
};
export type Slice02Snapshot = Omit<ActiveScoreSnapshot, "value" | "feasibility"> & {
  resultContractVersion: typeof RESULT_CONTRACT_VERSION; engineVersion: string; scoringConfigVersion: string;
  conflicts: ScoreConcernViewModel[]; risks: ScoreConcernViewModel[]; blockers: ScoreConcernViewModel[];
  value: Slice02Axis; feasibility: Slice02Axis;
};
export type ProcessCardView = {
  processId: string;
  processName: string;
  sourceRegistry: {
    registryVersionId: string;
    fileName: string;
    sheetName: string;
    rowNumber: number;
    sourceReferenceId?: string | null;
    officialProcessCode?: string | null;
  };
  scoreProcessing: {
    state: "PENDING" | "RUNNING" | "AVAILABLE" | "FAILED";
    error: (SafeError & { retryable: boolean }) | null;
  };
  activeScoreSnapshot: ActiveScoreSnapshot | null;
  sourceFacts: {
    label: string;
    value: Value;
    unit?: string | null;
    factStatus: FactStatus;
    sourceReferenceIds: string[];
  }[];
  dataQualityIssues: DataQualityIssueViewModel[];
};
export type SourceDetailsView = {
  sourceReferenceId: string;
  sourceType: SourceType;
  factStatus: FactStatus | null;
  sourceName?: string | null;
  sourceRole?: string | null;
  sheet?: string | null;
  row?: number | null;
  column?: string | null;
  coordinate?: string | null;
  excerptOrValue?: Value;
  verificationState?: string | null;
  derivation?: {
    ruleId: string;
    ruleVersion: string;
    trace?: string | null;
    inputSourceReferenceIds: string[];
  } | null;
};
