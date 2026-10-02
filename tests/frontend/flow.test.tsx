// @vitest-environment jsdom
import "./setup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RegistryPage } from "../../src/features/registry/RegistryPage";
import { ProcessPage } from "../../src/features/process/ProcessPage";
import { RegistryService } from "../../src/server/service";
import { calculatePreScore } from "../../src/server/scoring/engine";
import { loadConfig } from "../../src/server/scoring/config";
import { official, OFFICIAL_CHECKSUM, tempStore } from "../helpers";
import { deferred } from "./helpers";
import type { Api } from "../../src/shared/api";

it("integrated Slice 01: original XLSM → exact sheet → selection → lazy partial PRE-SCORE → reopen", async () => {
  vi.useFakeTimers();
  const storage = tempStore();
  try {
    const gate = deferred<void>();
    const scorer = vi.fn(async (input: Parameters<typeof calculatePreScore>[0]) => { await gate.promise; return calculatePreScore(input); });
    const service = new RegistryService(storage.store, loadConfig, scorer);
    let sheetJob: ReturnType<RegistryService["selectSheet"]> | null = null;
    let scoreJob: ReturnType<RegistryService["openProcess"]>["job"] = null;
    let versionId = "";
    // In-process transport adapter, using the real backend for every read model and decision.
    const api: Api = {
      upload: vi.fn(async file => {
        const metadata = service.upload(new Uint8Array(await file.arrayBuffer()), file.name); versionId = metadata.registryVersionId; return metadata;
      }),
      selectSheet: vi.fn(async (id, sheet) => { sheetJob = service.selectSheet(id, sheet); return sheetJob.view; }),
      readRegistry: vi.fn(async id => service.readRegistry(id)),
      openProcess: vi.fn(async id => { const result = service.openProcess(id); scoreJob = result.job; return result.view; }),
      readProcess: vi.fn(async id => service.readProcess(id)), retryScore: vi.fn(async id => service.retryScore(id).view),
      readSource: vi.fn(async id => service.readSource(id)),
    };
    const bytes = official();
    const file = new File([Uint8Array.from(bytes).buffer], "Реестр МЛХ.xlsm");
    // jsdom File lacks arrayBuffer; supply the standard browser API with the same original bytes.
    Object.defineProperty(file, "arrayBuffer", { value: async () => Uint8Array.from(bytes).buffer });
    const view = render(<RegistryPage api={api} />);
    await act(async () => { fireEvent.change(screen.getByLabelText("Файл реестра"), { target: { files: [file] } }); });
    expect(api.upload).toHaveBeenCalledWith(file);
    expect(screen.getByRole("option", { name: "Цифра" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    // An explicitly selected incompatible sheet must not fall back to the default.
    await act(async () => { fireEvent.change(screen.getByLabelText("Лист для обработки"), { target: { value: "Цифра" } }); });
    service.processSheet(versionId, sheetJob!.runId);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByRole("alert")).toHaveTextContent("Не найдена полная сигнатура");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    await act(async () => { fireEvent.change(screen.getByLabelText("Лист для обработки"), { target: { value: "Лист3" } }); });
    service.processSheet(versionId, sheetJob!.runId);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(service.readRegistry(versionId).canContinue).toBe(true);
    expect(scorer).not.toHaveBeenCalled();
    const row14 = storage.store.read().registries[versionId].sheets["Лист3"].rows.find(r => r.excelRowNumber === 14)!;
    const process = Object.values(storage.store.read().processes).find(p => p.sourceRowId === row14.sourceRowId)!;
    fireEvent.click(screen.getAllByRole("radio").find(r => (r as HTMLInputElement).value === process.processId)!);
    expect(screen.getByRole("link", { name: /Открыть карточку/ })).toHaveAttribute("href", `/process/${process.processId}`);
    view.unmount();
    let processView!: ReturnType<typeof render>;
    await act(async () => { processView = render(<ProcessPage processId={process.processId} api={api} />); });
    expect(screen.getAllByText("Расчёт PRE-SCORE ожидает запуска…")).toHaveLength(2);
    expect(screen.getByText("Качество данных")).toBeVisible();
    const running = service.runScore(scoreJob!);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getAllByText("Расчёт PRE-SCORE выполняется…")).toHaveLength(2);
    await act(async () => { gate.resolve(); await running; await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByText("13–25")).toBeVisible(); expect(screen.getByText(/^40\s*%$/)).toBeVisible();
    expect(screen.getByText("V1_FREQUENCY_v1.1")).toBeInTheDocument();
    expect(screen.getByText("V2_LABOR_v1.1")).toBeInTheDocument();
    expect(service.readProcess(process.processId).activeScoreSnapshot!.value.criteria.slice(2).every(c => c.score === null)).toBe(true);
    expect(service.readProcess(process.processId).activeScoreSnapshot!.feasibility.criteria.every(c => c.score === null)).toBe(true);
    processView.unmount();
    await act(async () => { render(<ProcessPage processId={process.processId} api={api} />); });
    expect(scoreJob).toBeNull(); expect(scorer).toHaveBeenCalledTimes(1);
    expect(storage.store.readOriginal(versionId)).toEqual(bytes);
    expect(service.readRegistry(versionId).checksum).toBe(OFFICIAL_CHECKSUM);
  } finally { storage.cleanup(); }
});
