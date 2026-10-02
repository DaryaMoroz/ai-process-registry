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
};
export type ScoreAxisViewModel = {
  maxScore: number;
  fullScore: number | null;
  knownSum: number;
  coverage: number;
  range: [number, number] | null;
  criteria: ScoreCriterionViewModel[];
};
export type ActiveScoreSnapshot = {
  scoreSnapshotId: string;
  inputSnapshotId: string;
  methodologyVersion: string;
  stage: ScoreStatus;
  value: ScoreAxisViewModel;
  feasibility: ScoreAxisViewModel;
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
