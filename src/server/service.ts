import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Database, DQIssue, ProcessRecord, RegistryRecord, ScoreSnapshot, InputSnapshot } from "./domain";
import type { ProcessCardView, RegistryProcessingView, SourceDetailsView, WorkbookMetadataResult } from "@/shared/contracts";
import { LocalStore, audit } from "./store";
import { ApplicationError, safeError } from "./errors";
import { sha256 } from "./identity";
import { readWorkbook } from "./registry/parser";
import { PROFILE, columns } from "./registry/profile";
import { mapSheet } from "./registry/mapping";
import { loadConfig, type LoadedConfig } from "./scoring/config";
import { calculatePreScore, eligibleForPre } from "./scoring/engine";
import { ownValue } from "./lookup";

type ScoreJob = { processId: string; attemptId: string };
const requireRegistry = (db: Database, registryVersionId: string): RegistryRecord => {
  const record = ownValue(db.registries, registryVersionId);
  if (!record) throw new ApplicationError("REGISTRY_NOT_FOUND", "Загрузка не найдена.", 404);
  return record;
};
const requireProcess = (db: Database, processId: string): ProcessRecord => {
  const record = ownValue(db.processes, processId);
  if (!record) throw new ApplicationError("PROCESS_NOT_FOUND", "Процесс не найден.", 404);
  return record;
};
function view(db: Database, record: ProcessRecord): ProcessCardView {
  const registry = requireRegistry(db, record.registryVersionId);
  const row = ownValue(registry.sheets, record.sheetName)!.rows.find(r => r.sourceRowId === record.sourceRowId)!;
  const attempt = record.attempts.at(-1);
  const snapshot = record.scoreSnapshots.find(s => s.scoreSnapshotId === record.activeScoreSnapshotId);
  return {
    processId: record.processId, processName: record.analysisUnit.name,
    sourceRegistry: { registryVersionId: record.registryVersionId, fileName: registry.view.fileName, sheetName: record.sheetName, rowNumber: row.excelRowNumber,
      officialProcessCode: record.facts.find(f => f.field === "official_process_code")?.value as string ?? null,
      sourceReferenceId: row.cells.find(c => c.canonicalField === "process_name")!.sourceCellId },
    scoreProcessing: { state: attempt?.state ?? "PENDING", error: attempt?.error ?? null },
    activeScoreSnapshot: snapshot ? { scoreSnapshotId: snapshot.scoreSnapshotId, inputSnapshotId: snapshot.inputSnapshotId, methodologyVersion: snapshot.methodologyVersion, stage: snapshot.stage, value: snapshot.value, feasibility: snapshot.feasibility } : null,
    sourceFacts: row.cells.filter(c => c.canonicalField !== "unmapped").map(c => ({ label: columns.find(col => col.field === c.canonicalField)!.header.replaceAll("*", ""), value: c.normalizedValue,
      unit: columns.find(col => col.field === c.canonicalField)?.unit ?? null, factStatus: c.normalizedValue === null ? "Unknown" : "Confirmed", sourceReferenceIds: [c.sourceCellId] })),
    dataQualityIssues: record.issues,
  };
}

export class RegistryService {
  constructor(readonly store: LocalStore, private config: () => LoadedConfig = loadConfig, private scorer: (input: InputSnapshot) => ScoreSnapshot | Promise<ScoreSnapshot> = calculatePreScore) {}

  upload(bytes: Uint8Array, fileName: string, profileId = PROFILE.id): WorkbookMetadataResult {
    if (profileId !== PROFILE.id) throw new ApplicationError("UNKNOWN_MAPPING_PROFILE", "Выбран неизвестный mapping-профиль.");
    const name = path.win32.basename(path.posix.basename(fileName)).replace(/[\u0000-\u001f]/g, "");
    const workbook = readWorkbook(bytes, name);
    const registryVersionId = randomUUID();
    const metadata: WorkbookMetadataResult = { registryVersionId, fileName: name, fileExtension: workbook.extension,
      fileSize: bytes.byteLength, checksum: workbook.checksum, profileId: PROFILE.id, mappingVersion: PROFILE.version,
      availableSheets: workbook.sheets.map(s => ({ name: s.name })), defaultSheet: PROFILE.defaultSheet, selectedSheet: PROFILE.defaultSheet, state: "READING" };
    this.store.saveOriginal(registryVersionId, bytes);
    this.store.transaction(db => {
      db.registries[registryVersionId] = { view: { ...metadata, processingRunId: null, canContinue: false, issues: [], selectableProcesses: [], error: null }, createdAt: new Date().toISOString(), runId: null, sheets: {} };
      audit(db, "REGISTRY_UPLOADED", registryVersionId, { checksum: workbook.checksum, mappingVersion: PROFILE.version }, "local_user");
    });
    return metadata;
  }
  selectSheet(registryVersionId: string, sheetName: string): { view: RegistryProcessingView; runId: string } {
    return this.store.transaction(db => {
      const registry = requireRegistry(db, registryVersionId);
      const runId = randomUUID(); registry.runId = runId;
      registry.view = { ...registry.view, processingRunId: runId, selectedSheet: sheetName, state: "READING", canContinue: false, selectableProcesses: [], issues: [], error: null };
      audit(db, "SHEET_PROCESSING_REQUESTED", registryVersionId, { sheetName, runId }, "local_user");
      return { view: registry.view, runId };
    });
  }
  processSheet(registryVersionId: string, runId: string): void {
    const registry = ownValue(this.store.read().registries, registryVersionId);
    if (!registry || registry.runId !== runId) return;
    try {
      const bytes = this.store.readOriginal(registryVersionId);
      if (sha256(bytes) !== registry.view.checksum) throw new ApplicationError("SOURCE_CHECKSUM_MISMATCH", "Контрольная сумма сохранённого файла изменилась.", 409);
      const cached = ownValue(registry.sheets, registry.view.selectedSheet);
      const result = cached ? null : mapSheet(readWorkbook(bytes, registry.view.fileName).readSheet(registry.view.selectedSheet), registryVersionId, registry.view.fileName, new Date().toISOString());
      if (sha256(this.store.readOriginal(registryVersionId)) !== registry.view.checksum) throw new ApplicationError("SOURCE_CHECKSUM_MISMATCH", "Контрольная сумма файла не совпадает после чтения.", 409);
      this.store.transaction(db => {
        const current = ownValue(db.registries, registryVersionId);
        if (!current || current.runId !== runId) return;
        if (result) {
          Object.defineProperty(current.sheets, current.view.selectedSheet, { enumerable: true, configurable: true, writable: true,
            value: { rows: result.rows, issues: result.issues, sources: result.sources, processIds: result.processes.map(p => p.processId) } });
          for (const process of result.processes) db.processes[process.processId] = process;
        }
        const sheet = ownValue(current.sheets, current.view.selectedSheet)!;
        // Structural success and selectable PROCESS records decide continuation, not DQ severity.
        current.view.canContinue = sheet.processIds.length > 0;
        current.view.state = sheet.issues.some(i => i.severity !== "INFO") ? "WARNING" : "VALID";
        current.view.issues = sheet.issues;
        current.view.selectableProcesses = sheet.processIds.map(id => {
          const p = requireProcess(db, id); const row = sheet.rows.find(r => r.sourceRowId === p.sourceRowId)!;
          return { processId: id, processName: p.analysisUnit.name, officialProcessCode: p.facts.find(f => f.field === "official_process_code")?.value as string ?? null,
            sourceRef: `${current.view.fileName} / ${p.sheetName} / строка ${row.excelRowNumber}` };
        });
        audit(db, "SHEET_PROCESSED", registryVersionId, { runId, sheetName: current.view.selectedSheet, sourceRows: sheet.rows.length, processes: sheet.processIds.length, issues: sheet.issues.length });
      });
    } catch (error) {
      const failure = safeError(error);
      this.store.transaction(db => {
        const current = ownValue(db.registries, registryVersionId);
        if (!current || current.runId !== runId) return;
        const dq: DQIssue = { id: randomUUID(), code: failure.code, severity: "ERROR", message: failure.message, affectsScoring: true, sourceReferenceIds: [],
          registryVersionId, sheet: current.view.selectedSheet, row: null, coordinate: null, rawEvidence: null, mappingVersion: PROFILE.version, status: "OPEN" };
        current.view = { ...current.view, state: "ERROR", canContinue: false, selectableProcesses: [], issues: [dq], error: { code: failure.code, message: failure.message } };
        audit(db, "SHEET_PROCESSING_FAILED", registryVersionId, { runId, code: failure.code });
      });
    }
  }
  readRegistry(id: string): RegistryProcessingView {
    const registry = requireRegistry(this.store.read(), id);
    return { ...registry.view, processingRunId: registry.runId };
  }
  openProcess(processId: string): { view: ProcessCardView; job: ScoreJob | null } {
    return this.ensureProcess(processId, false);
  }
  retryScore(processId: string): { view: ProcessCardView; job: ScoreJob | null } {
    return this.ensureProcess(processId, true);
  }
  private ensureProcess(processId: string, retry: boolean): { view: ProcessCardView; job: ScoreJob | null } {
    return this.store.transaction(db => {
      const record = requireProcess(db, processId);
      const previous = record.attempts.at(-1);
      let job: ScoreJob | null = null;
      if (retry && previous?.state === "FAILED" && !previous.error?.retryable) throw new ApplicationError("RETRY_NOT_ALLOWED", "Повтор этого расчёта недоступен.", 409);
      const create = retry ? previous?.state === "FAILED" && previous.error?.retryable : !previous && !record.activeScoreSnapshotId;
      if (create) {
        const attemptId = randomUUID();
        record.attempts.push({ attemptId, inputSnapshotId: null, state: "PENDING", error: null, createdAt: new Date().toISOString(), finishedAt: null });
        job = { processId, attemptId };
        audit(db, retry ? "SCORE_RETRY_REQUESTED" : "SCORE_PENDING", processId, { attemptId }, "local_user");
      }
      return { view: view(db, record), job };
    });
  }
  async runScore(job: ScoreJob): Promise<void> {
    try {
      const initial = requireProcess(this.store.read(), job.processId);
      if (initial.attempts.at(-1)?.attemptId !== job.attemptId || initial.attempts.at(-1)?.state !== "PENDING") return;
      const loaded = this.config();
      const input = this.store.transaction(db => {
        const record = requireProcess(db, job.processId), attempt = record.attempts.at(-1)!;
        if (attempt.attemptId !== job.attemptId || attempt.state !== "PENDING") return null;
        const facts = record.facts.filter(f => eligibleForPre(f, record.facts));
        // Retry reuses an identical frozen input, never overwrites an earlier result.
        let input = record.inputSnapshots.find(s => s.configChecksum === loaded.checksum && s.cardVersion === record.cardVersion);
        if (!input) {
          input = { inputSnapshotId: randomUUID(), analysisUnitId: record.analysisUnit.analysisUnitId, methodologyVersion: loaded.config.methodology_version,
            configVersion: loaded.config.config_schema_version, configChecksum: loaded.checksum, configYaml: loaded.yaml, mappingVersion: PROFILE.version,
            cardVersion: record.cardVersion, createdAt: attempt.createdAt, facts: structuredClone(facts), conflictFields: [] };
          record.inputSnapshots.push(input);
          audit(db, "INPUT_SNAPSHOT_CREATED", record.processId, { inputSnapshotId: input.inputSnapshotId, factIds: facts.map(f => f.factId), configChecksum: loaded.checksum });
        }
        attempt.inputSnapshotId = input.inputSnapshotId; attempt.state = "RUNNING";
        audit(db, "SCORE_RUNNING", record.processId, { attemptId: attempt.attemptId });
        return input;
      });
      if (!input) return;
      const result = await this.scorer(input);
      this.store.transaction(db => {
        const record = requireProcess(db, job.processId), attempt = record.attempts.at(-1)!;
        if (attempt.attemptId !== job.attemptId || attempt.state !== "RUNNING") return;
        if (!record.scoreSnapshots.some(s => s.scoreSnapshotId === result.scoreSnapshotId)) record.scoreSnapshots.push(result);
        record.activeScoreSnapshotId = result.scoreSnapshotId; attempt.state = "AVAILABLE"; attempt.finishedAt = new Date().toISOString();
        audit(db, "SCORE_AVAILABLE", record.processId, { attemptId: attempt.attemptId, scoreSnapshotId: result.scoreSnapshotId, derivedFactIds: result.derivedFacts.map(f => f.factId) });
      });
    } catch (error) {
      const failure = safeError(error);
      this.store.transaction(db => {
        const record = requireProcess(db, job.processId), attempt = record.attempts.at(-1)!;
        if (attempt.attemptId !== job.attemptId || attempt.state === "AVAILABLE" || attempt.state === "FAILED") return;
        attempt.state = "FAILED"; attempt.finishedAt = new Date().toISOString();
        attempt.error = { code: failure.code, message: failure.message, retryable: failure.retryable };
        audit(db, "SCORE_FAILED", record.processId, { attemptId: attempt.attemptId, code: failure.code });
      });
    }
  }
  readProcess(processId: string): ProcessCardView { const db = this.store.read(); return view(db, requireProcess(db, processId)); }
  readSource(sourceReferenceId: string): SourceDetailsView {
    const db = this.store.read();
    for (const registry of Object.values(db.registries)) for (const sheet of Object.values(registry.sheets)) {
      const source = sheet.sources.find(s => s.sourceReferenceId === sourceReferenceId); if (source) return source;
    }
    for (const record of Object.values(db.processes)) for (const snapshot of record.scoreSnapshots) {
      const source = snapshot.sourceReferences.find(s => s.sourceReferenceId === sourceReferenceId); if (source) return source;
    }
    throw new ApplicationError("SOURCE_NOT_FOUND", "Источник не найден.", 404);
  }
}
