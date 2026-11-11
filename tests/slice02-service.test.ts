import { describe, expect, it, vi } from "vitest";
import { RegistryService } from "../src/server/service";
import { calculatePreScore } from "../src/server/scoring/engine";
import { parseConfig } from "../src/server/scoring/config";
import { LocalStore } from "../src/server/store";
import type { InputSnapshot, ScoreSnapshot } from "../src/server/domain";
import { importOfficial, tempStore, official, OFFICIAL_CHECKSUM } from "./helpers";
import { loaded, scoringFact } from "./slice02-helpers";
import { sha256 } from "../src/server/identity";

describe("S02-T17–25/32–34/37/38: existing service with full evaluator contract", () => {
  it("lazy ten-evaluator result persists and is reused after restart; other processes remain untouched", async () => {
    const storage = tempStore();
    try {
      const scorer = vi.fn(calculatePreScore), service = new RegistryService(storage.store, () => loaded, scorer);
      const registry = importOfficial(service), id = registry.selectableProcesses[0].processId;
      const initial = service.openProcess(id); expect(initial.view.activeScoreSnapshot).toBeNull(); expect(initial.view.scoreProcessing.state).toBe("PENDING");
      expect(service.openProcess(id).job).toBeNull();
      await service.runScore(initial.job!);
      const card = service.readProcess(id), snapshot = card.activeScoreSnapshot!;
      expect(snapshot.resultContractVersion).toBe("slice02.pre-score.v1");
      expect(snapshot.value.criteria).toHaveLength(5); expect(snapshot.feasibility.criteria).toHaveLength(5);
      expect(snapshot.value).toMatchObject({ knownCount: 2, unknownCount: 3, knownSum: 3, coverage: .4, range: [6, 18], fullScore: null });
      expect(snapshot.feasibility).toMatchObject({ knownCount: 0, unknownCount: 5, range: [5, 25], fullScore: null });
      expect(snapshot.engineVersion).toBe("slice-02-engine-1"); expect(snapshot.scoringConfigVersion).toBe(`sha256:${loaded.checksum}`);
      expect(new RegistryService(new LocalStore(storage.directory)).openProcess(id).job).toBeNull();
      expect(scorer).toHaveBeenCalledTimes(1);
      expect(Object.values(storage.store.read().processes).filter(p => p.attempts.length)).toHaveLength(1);
      const source = service.readSource(snapshot.value.criteria[1].sourceReferenceIds.find(s => s.endsWith(":source"))!);
      expect(source).toMatchObject({ sourceType: "calculated", factStatus: "Derived", excerptOrValue: 48 });
      expect(service.readSource(source.derivation!.inputSourceReferenceIds[0]).coordinate).toBe("L9");
      expect(storage.store.readOriginal(registry.registryVersionId)).toEqual(official()); expect(sha256(official())).toBe(OFFICIAL_CHECKSUM);
    } finally { storage.cleanup(); }
  });
  it("legacy V1/V2-only snapshot remains byte-identical history; new compatible result is actually evaluated", async () => {
    const storage = tempStore();
    try {
      const scorer = vi.fn(calculatePreScore), service = new RegistryService(storage.store, () => loaded, scorer);
      const id = importOfficial(service).selectableProcesses[0].processId;
      await service.runScore(service.openProcess(id).job!);
      const legacy = storage.store.transaction(db => {
        const record = db.processes[id], snapshot = record.scoreSnapshots[0];
        delete snapshot.resultContractVersion; delete snapshot.scoringConfigVersion; delete snapshot.conflicts; delete snapshot.risks; delete snapshot.blockers;
        snapshot.scoreSnapshotId = "historical-score"; snapshot.engineVersion = "slice-01-engine-1";
        snapshot.value.criteria = snapshot.value.criteria.slice(0, 2); snapshot.feasibility.criteria = [];
        snapshot.criterionResults = snapshot.criterionResults.slice(0, 2);
        record.activeScoreSnapshotId = snapshot.scoreSnapshotId;
        delete record.attempts[0].resultContractVersion; delete record.inputSnapshots[0].inputIdentity;
        return snapshot;
      });
      const legacyJson = JSON.stringify(legacy), open = service.openProcess(id);
      expect(open.view.activeScoreSnapshot).toBeNull(); expect(open.view.scoreProcessing.state).toBe("PENDING");
      expect(service.openProcess(id).job).toBeNull();
      await Promise.all([service.runScore(open.job!), service.runScore(open.job!)]);
      const record = storage.store.read().processes[id];
      expect(record.scoreSnapshots).toHaveLength(2); expect(record.inputSnapshots).toHaveLength(2);
      expect(JSON.stringify(record.scoreSnapshots[0])).toBe(legacyJson);
      expect(record.scoreSnapshots[0].resultContractVersion).toBeUndefined();
      expect(record.scoreSnapshots[1].criterionResults).toHaveLength(10); expect(scorer).toHaveBeenCalledTimes(2);
      expect(service.openProcess(id).job).toBeNull();
    } finally { storage.cleanup(); }
  });
  it("actual config identity participates in compatibility and input reuse", async () => {
    const storage = tempStore();
    try {
      let current = loaded; const service = new RegistryService(storage.store, () => current), id = importOfficial(service).selectableProcesses[0].processId;
      await service.runScore(service.openProcess(id).job!);
      const old = service.readProcess(id).activeScoreSnapshot!;
      current = parseConfig(`${loaded.yaml}\n# Equivalent approved configuration, distinct content identity\n`);
      const next = service.openProcess(id); expect(next.job).not.toBeNull(); expect(next.view.activeScoreSnapshot).toBeNull();
      await service.runScore(next.job!);
      expect(service.readProcess(id).activeScoreSnapshot!.scoringConfigVersion).toBe(`sha256:${current.checksum}`);
      expect(storage.store.read().processes[id].scoreSnapshots[0].scoreSnapshotId).toBe(old.scoreSnapshotId);
      expect(storage.store.read().processes[id].scoreSnapshots).toHaveLength(2);
    } finally { storage.cleanup(); }
  });
  it("stale calculation completion cannot replace a newer attempt", async () => {
    const storage = tempStore();
    try {
      const releases: ((result: ScoreSnapshot) => void)[] = [], inputs: InputSnapshot[] = [];
      const service = new RegistryService(storage.store, () => loaded, input => { inputs.push(input); return new Promise(resolve => releases.push(resolve)); });
      const id = importOfficial(service).selectableProcesses[0].processId;
      const old = service.runScore(service.openProcess(id).job!);
      storage.store.transaction(db => { db.processes[id].cardVersion++; });
      const nextJob = service.openProcess(id).job!, next = service.runScore(nextJob);
      releases[1](calculatePreScore(inputs[1])); await next;
      const active = service.readProcess(id).activeScoreSnapshot;
      releases[0](calculatePreScore(inputs[0])); await old;
      expect(service.readProcess(id).activeScoreSnapshot).toEqual(active);
      expect(storage.store.read().processes[id].scoreSnapshots).toHaveLength(1);
      expect(storage.store.read().processes[id].attempts[0]).toMatchObject({ state: "FAILED", error: { code: "ATTEMPT_SUPERSEDED", retryable: false } });
    } finally { storage.cleanup(); }
  });
  it.each(["duplicate", "missing", "wrong-axis", "unknown", "mixed-snapshot", "sum", "count", "range", "config", "trace"]) ("publication of malformed %s result fails atomically, card/DQ survive", async mutation => {
    const storage = tempStore();
    try {
      const service = new RegistryService(storage.store, () => loaded, input => {
        const result = calculatePreScore(input);
        if (mutation === "duplicate") result.value.criteria[1].id = "V1";
        if (mutation === "missing") result.feasibility.criteria.pop();
        if (mutation === "wrong-axis") result.value.criteria[0].id = "F1";
        if (mutation === "unknown") result.value.criteria[0].id = "X1";
        if (mutation === "mixed-snapshot") result.value.criteria[0].provenance!.scoreSnapshotId = "other";
        if (mutation === "sum") result.value.knownSum = 4;
        if (mutation === "count") result.value.knownCount = 5;
        if (mutation === "range") result.value.range = [7, 18];
        if (mutation === "config") result.configChecksum = "wrong";
        if (mutation === "trace") result.criterionResults[0].score = 5;
        return result;
      });
      const id = importOfficial(service).selectableProcesses[0].processId, open = service.openProcess(id);
      await service.runScore(open.job!);
      const failed = service.readProcess(id);
      expect(failed.scoreProcessing).toMatchObject({ state: "FAILED", error: { code: "INVALID_SCORE_RESULT", retryable: false } });
      expect(failed.activeScoreSnapshot).toBeNull(); expect(failed.processName).toBe(open.view.processName);
      expect(failed.dataQualityIssues).toEqual(open.view.dataQualityIssues); expect(storage.store.read().processes[id].scoreSnapshots).toEqual([]);
      expect(service.openProcess(id).job).toBeNull();
      expect(() => service.retryScore(id)).toThrow(expect.objectContaining({ code: "RETRY_NOT_ALLOWED" }));
    } finally { storage.cleanup(); }
  });
  it("inadmissible percent is excluded from frozen eligible facts, and unconfirmed blocker metadata stays a risk", async () => {
    const storage = tempStore();
    try {
      const service = new RegistryService(storage.store, () => loaded), id = importOfficial(service).selectableProcesses[0].processId;
      storage.store.transaction(db => {
        const record = db.processes[id];
        record.facts.push(scoringFact("manual_work_share_percent", 99, { analysisUnitId: record.analysisUnit.analysisUnitId, sourceType: "interview" }),
          scoringFact("legal_infosec_pdn_block", true, { analysisUnitId: record.analysisUnit.analysisUnitId, factStatus: "Inferred" }));
      });
      await service.runScore(service.openProcess(id).job!);
      const record = storage.store.read().processes[id], snapshot = service.readProcess(id).activeScoreSnapshot!;
      expect(record.inputSnapshots[0].facts.some(f => f.field === "manual_work_share_percent" || f.field === "legal_infosec_pdn_block")).toBe(false);
      expect(snapshot.value.criteria[2]).toMatchObject({ score: null, reasonCode: "INELIGIBLE_EVIDENCE", sourceReferenceIds: [] });
      expect(snapshot.blockers).toEqual([]); expect(snapshot.risks!.some(r => r.description.includes("LEGAL_INFOSEC_PDN_BLOCK"))).toBe(true);
    } finally { storage.cleanup(); }
  });
});
