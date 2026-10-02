import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegistryService } from "../src/server/service";
import { official, OFFICIAL_CHECKSUM, synthetic, tempStore } from "./helpers";

const scheduling = vi.hoisted(() => ({ jobs: [] as (() => unknown)[] }));
vi.mock("next/server", () => ({ after: (job: () => unknown) => scheduling.jobs.push(job) }));
vi.mock("../src/server/runtime", () => ({ service: () => currentService }));
import { POST } from "../src/app/api/operations/route";
let storage: ReturnType<typeof tempStore>, currentService: RegistryService;
beforeEach(() => { storage = tempStore(); currentService = new RegistryService(storage.store); scheduling.jobs = []; });
afterEach(() => storage.cleanup());
const operation = async (data: Record<string, unknown>) => POST(new Request("http://localhost/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
const upload = async (bytes: Uint8Array, name: string) => {
  const form = new FormData(); form.set("file", new File([Uint8Array.from(bytes).buffer], name));
  return POST(new Request("http://localhost/api/operations", { method: "POST", body: form }));
};
describe("HTTP application operations and safe boundaries", () => {
  it("uploads original bytes, exposes run identity, processes exact sheet and lazily activates one card", async () => {
    const response = await upload(official(), "Реестр МЛХ.xlsm"); expect(response.status).toBe(200);
    const metadata = await response.json(); expect(metadata.checksum).toBe(OFFICIAL_CHECKSUM);
    const selected = await (await operation({ operation: "SelectSheetForProcessing", registryVersionId: metadata.registryVersionId, sheetName: "Лист3" })).json();
    expect(selected).toMatchObject({ state: "READING", canContinue: false, selectableProcesses: [], processingRunId: expect.any(String) });
    await scheduling.jobs.shift()!();
    const result = await (await operation({ operation: "ReadRegistryProcessing", registryVersionId: metadata.registryVersionId })).json();
    expect(result.processingRunId).toBe(selected.processingRunId); expect(result.selectableProcesses).toHaveLength(6);
    const processId = result.selectableProcesses[0].processId;
    expect(scheduling.jobs).toHaveLength(0);
    const card = await (await operation({ operation: "OpenProcessCard", processId })).json();
    expect(card).toMatchObject({ processId, activeScoreSnapshot: null, scoreProcessing: { state: "PENDING" } });
    await operation({ operation: "OpenProcessCard", processId }); expect(scheduling.jobs).toHaveLength(1);
    await scheduling.jobs.shift()!();
    const available = await (await operation({ operation: "ReadProcessCard", processId })).json();
    expect(available).toMatchObject({ scoreProcessing: { state: "AVAILABLE" }, activeScoreSnapshot: { stage: "PRE_SCORE", value: { fullScore: null } } });
    const source = await (await operation({ operation: "ReadSourceDetails", sourceReferenceId: available.sourceRegistry.sourceReferenceId })).json();
    expect(source).toMatchObject({ sourceType: "registry", factStatus: "Confirmed" });
    expect(storage.store.readOriginal(metadata.registryVersionId)).toEqual(official());
  });
  it("returns safe errors for invalid upload and malformed requests without creating a registry", async () => {
    const response = await upload(new Uint8Array([1, 2, 3]), "bad.xlsx");
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ error: { code: "INVALID_WORKBOOK" } });
    expect(Object.keys(storage.store.read().registries)).toHaveLength(0);
    const malformed = await POST(new Request("http://localhost/api/operations", { method: "POST", body: "{" }));
    expect(await malformed.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
    const noFile = await POST(new Request("http://localhost/api/operations", { method: "POST", body: new FormData() }));
    expect(await noFile.json()).toMatchObject({ error: { code: "FILE_REQUIRED" } });
  });
  it("rejects cross-origin operations", async () => {
    const response = await POST(new Request("http://localhost/api/operations", { method: "POST", headers: { origin: "http://other.example" } }));
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: { code: "ORIGIN_NOT_ALLOWED" } });
  });
  it("normalizes untrusted filenames and stores originals only under generated version IDs", async () => {
    const bytes = synthetic();
    const meta = currentService.upload(bytes, "C:\\private\\..\\..\\source\\official.xlsx\u0000");
    expect(meta.fileName).toBe("official.xlsx"); expect(meta.registryVersionId).not.toContain("official");
    expect(storage.store.readOriginal(meta.registryVersionId)).toEqual(Buffer.from(bytes));
  });
  it("allows an exact compatible sheet named __proto__ without prototype-based cache assumptions", () => {
    const metadata = currentService.upload(synthetic({ name: "__proto__" }), "file.xlsx");
    const job = currentService.selectSheet(metadata.registryVersionId, "__proto__"); currentService.processSheet(metadata.registryVersionId, job.runId);
    expect(currentService.readRegistry(metadata.registryVersionId)).toMatchObject({ selectedSheet: "__proto__", canContinue: true });
  });
});
