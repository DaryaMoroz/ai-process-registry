import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "./domain";

export function audit(db: Database, type: string, entityId: string, metadata: Record<string, unknown> = {}, actor: "local_user" | "system" = "system") {
  db.audit.push({ id: randomUUID(), type, entityId, timestamp: new Date().toISOString(), actor, metadata });
}

function containsPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return !relative || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
// Resolve existing ancestors too, so a configurable, not-yet-created directory through a junction is checked.
function canonicalPath(directory: string): string {
  let ancestor = directory;
  const suffix: string[] = [];
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("Storage path has no existing ancestor");
    suffix.unshift(path.basename(ancestor)); ancestor = parent;
  }
  return path.join(realpathSync(ancestor), ...suffix);
}

// Single local Node process. Synchronous transactions cannot interleave between awaits.
// Atomic file replacement ensures a reader never observes a half-written analytical state.
export class LocalStore {
  private database: Database;
  readonly directory: string;
  constructor(directory = path.join(process.cwd(), ".registry-data")) {
    this.directory = path.resolve(directory);
    const source = path.resolve(process.cwd(), "source");
    if (containsPath(source, this.directory) || containsPath(canonicalPath(source), canonicalPath(this.directory))) throw new Error("Storage cannot be inside source/");
    mkdirSync(path.join(this.directory, "originals"), { recursive: true });
    const stateFile = path.join(this.directory, "state.json");
    this.database = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) as Database : { schemaVersion: 1, registries: {}, processes: {}, audit: [] };
    if (this.database.schemaVersion !== 1) throw new Error("Unsupported local storage schema");
    // An interrupted attempt is never silently rerun on OpenProcessCard.
    this.transaction(db => {
      for (const process of Object.values(db.processes)) {
        const attempt = process.attempts.at(-1);
        if (attempt?.state === "PENDING" || attempt?.state === "RUNNING") {
          attempt.state = "FAILED"; attempt.finishedAt = new Date().toISOString();
          attempt.error = { code: "PROCESSING_INTERRUPTED", message: "Сервер был перезапущен во время расчёта. Расчёт можно повторить.", retryable: true };
          audit(db, "SCORE_FAILED", process.processId, { attemptId: attempt.attemptId, code: attempt.error.code });
        }
      }
      for (const registry of Object.values(db.registries)) if (registry.runId && registry.view.state === "READING") {
        registry.view.state = "ERROR"; registry.view.canContinue = false; registry.view.selectableProcesses = [];
        registry.view.error = { code: "PROCESSING_INTERRUPTED", message: "Обработка листа прервана. Выберите лист повторно." };
        registry.runId = null;
        registry.view.processingRunId = null;
      }
    });
  }
  read(): Database { return structuredClone(this.database); }
  transaction<T>(operation: (db: Database) => T): T {
    const draft = structuredClone(this.database);
    const result = operation(draft);
    const temp = path.join(this.directory, `state-${randomUUID()}.tmp`);
    writeFileSync(temp, JSON.stringify(draft), { encoding: "utf8", flag: "wx", flush: true });
    renameSync(temp, path.join(this.directory, "state.json"));
    this.database = draft;
    return structuredClone(result);
  }
  saveOriginal(versionId: string, bytes: Uint8Array) {
    this.validateId(versionId);
    writeFileSync(path.join(this.directory, "originals", `${versionId}.bin`), bytes, { flag: "wx", flush: true });
  }
  readOriginal(versionId: string): Buffer {
    this.validateId(versionId);
    return readFileSync(path.join(this.directory, "originals", `${versionId}.bin`));
  }
  private validateId(id: string) { if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid storage identifier"); }
}
