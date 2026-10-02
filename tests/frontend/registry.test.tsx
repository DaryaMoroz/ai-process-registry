// @vitest-environment jsdom
import "./setup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { RegistryPage } from "../../src/features/registry/RegistryPage";
import { apiStub, deferred, metadata, registry } from "./helpers";
import type { RegistryProcessingView } from "../../src/shared/contracts";

const restore = async (api: ReturnType<typeof apiStub>) => {
  sessionStorage.setItem("registry-slice-current-upload", "upload-fixture");
  await act(async () => { render(<RegistryPage api={api} />); });
};
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(400); });
const choose = (name: string) => act(async () => { fireEvent.change(screen.getByLabelText("Лист для обработки"), { target: { value: name } }); });
const processing = (sheet: string, run: string) => registry({ selectedSheet: sheet, processingRunId: run, state: "READING", canContinue: false, selectableProcesses: [] });

describe("FE-10–16 / FX-01–06: registry contract and current processing identity", () => {
  it("FX-01 EMPTY accepts xlsx/xlsm and submits the original File", async () => {
    const upload = deferred<ReturnType<typeof metadata>>();
    const api = apiStub({ upload: vi.fn(() => upload.promise) });
    render(<RegistryPage api={api} />);
    const input = screen.getByLabelText("Файл реестра");
    expect(input).toHaveAttribute("accept", ".xlsx,.xlsm");
    expect(screen.getByText(/Исходный реестр не изменяется/)).toBeVisible();
    const file = new File(["original bytes"], "official.xlsm");
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(api.upload).toHaveBeenCalledWith(file);
    expect(screen.getByRole("button", { name: "Чтение файла…" })).toBeDisabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("drag/drop submits the same original File", async () => {
    const api = apiStub(); const view = render(<RegistryPage api={api} />);
    const file = new File(["bytes"], "source.xlsm");
    await act(async () => { fireEvent.drop(view.container.querySelector(".upload-area")!, { dataTransfer: { files: [file] } }); });
    expect(api.upload).toHaveBeenCalledWith(file);
  });
  it("FE-31 process selection works from the keyboard and disabled continuation is semantic", async () => {
    const user = userEvent.setup(); await restore(apiStub());
    expect(screen.getByRole("button", { name: /Открыть карточку/ })).toBeDisabled();
    screen.getByRole("radio").focus(); await user.keyboard(" ");
    expect(screen.getByRole("radio")).toBeChecked();
    expect(screen.getByRole("link", { name: /Открыть карточку/ })).toHaveAttribute("href", "/process/internal-process-1");
  });
  it("FX-02 metadata and available sheets come from backend; selection stays hidden while processing", async () => {
    const api = apiStub(); render(<RegistryPage api={api} />);
    await act(async () => { fireEvent.change(screen.getByLabelText("Файл реестра"), { target: { files: [new File(["x"], "file.xlsx")] } }); });
    expect(api.selectSheet).toHaveBeenCalledWith("upload-fixture", "Лист3");
    expect(screen.getByRole("option", { name: "Другой" })).toBeInTheDocument();
    expect(screen.getByText("Обработка листа")).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it.each(["VALID", "WARNING"] as const)("FX-03/04 %s follows backend canContinue and internal processId", async state => {
    await restore(apiStub({ readRegistry: vi.fn(async () => registry({ state })) }));
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByRole("link", { name: /Открыть карточку/ })).toHaveAttribute("href", "/process/internal-process-1");
    expect(screen.getByText("Официальный код: ОП.")).toBeVisible();
  });
  it("WARNING remains selectable even with an individual ERROR issue", async () => {
    await restore(apiStub({ readRegistry: vi.fn(async () => registry({ state: "WARNING", issues: [{ id: "dq", code: "INVALID_NUMBER", severity: "ERROR", message: "Проверить число", sourceReferenceIds: [] }] })) }));
    expect(screen.getByRole("radio")).toBeEnabled();
  });
  it.each([
    registry({ state: "WARNING", canContinue: false }),
    registry({ selectableProcesses: [], canContinue: false }),
    registry({ selectableProcesses: [], canContinue: true }),
  ])("never fabricates a selection from a denied or empty backend list", async result => {
    await restore(apiStub({ readRegistry: vi.fn(async () => result) }));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Открыть карточку/ })).not.toBeInTheDocument();
  });
  it("FX-05 invalid upload is safe and replacement remains available", async () => {
    const api = apiStub({ upload: vi.fn(async () => { throw new Error("Не удалось прочитать книгу."); }) });
    render(<RegistryPage api={api} />);
    await act(async () => { fireEvent.change(screen.getByLabelText("Файл реестра"), { target: { files: [new File(["bad"], "bad.xlsx")] } }); });
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось прочитать книгу.");
    expect(screen.getByRole("button", { name: "Выбрать файл" })).toBeEnabled();
    expect(api.selectSheet).not.toHaveBeenCalled();
  });
  it("FX-05 incompatible sheet ERROR offers retry and withdraws processes", async () => {
    await restore(apiStub({ readRegistry: vi.fn(async () => registry({ state: "ERROR", canContinue: false, selectableProcesses: [], error: { code: "MAPPING_HEADER_NOT_FOUND", message: "Несовместимый лист" } })) }));
    expect(screen.getByRole("alert")).toHaveTextContent("Несовместимый лист");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("FX-06 A → B hides A until B is acknowledged, then applies only B's run", async () => {
    vi.useFakeTimers();
    const selected = deferred<RegistryProcessingView>();
    const readRegistry = vi.fn().mockResolvedValueOnce(registry()).mockResolvedValue(registry({ selectedSheet: "Другой", processingRunId: "B-run", selectableProcesses: [{ processId: "b", processName: "Процесс B", sourceRef: null }] }));
    const api = apiStub({ readRegistry, selectSheet: vi.fn(() => selected.promise) });
    await restore(api); await choose("Другой"); await tick();
    expect(readRegistry).toHaveBeenCalledTimes(1); // no polling before acknowledgment
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    await act(async () => { selected.resolve(processing("Другой", "B-run")); }); await tick();
    expect(screen.getByText("Процесс B")).toBeVisible();
  });
  it("FX-06 A → B → A cannot resurrect old A while B and new A are queued", async () => {
    vi.useFakeTimers();
    const b = deferred<RegistryProcessingView>(), a = deferred<RegistryProcessingView>();
    const readRegistry = vi.fn().mockResolvedValueOnce(registry()).mockResolvedValue(registry());
    const selectSheet = vi.fn().mockReturnValueOnce(b.promise).mockReturnValueOnce(a.promise);
    await restore(apiStub({ readRegistry, selectSheet }));
    await choose("Другой"); await choose("Лист3"); await tick();
    expect(selectSheet).toHaveBeenCalledTimes(1); expect(readRegistry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    await act(async () => { b.resolve(processing("Другой", "B-run")); });
    expect(selectSheet).toHaveBeenCalledTimes(2);
    await tick(); expect(readRegistry).toHaveBeenCalledTimes(1);
    await act(async () => { a.resolve(processing("Лист3", "new-A-run")); }); await tick();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument(); // returned A has the old run
    readRegistry.mockResolvedValue(registry({ processingRunId: "new-A-run" })); await tick();
    expect(screen.getByRole("radio")).toBeVisible();
  });
  it("ignores an old polling response arriving after a newer user choice", async () => {
    vi.useFakeTimers();
    const old = deferred<RegistryProcessingView>();
    const readRegistry = vi.fn().mockResolvedValueOnce(processing("Лист3", "old-A-run")).mockReturnValueOnce(old.promise).mockResolvedValue(processing("Другой", "B-run"));
    await restore(apiStub({ readRegistry, selectSheet: vi.fn(async () => processing("Другой", "B-run")) }));
    await tick(); await choose("Другой");
    await act(async () => { old.resolve(registry({ processingRunId: "old-A-run" })); });
    expect(screen.getByLabelText("Лист для обработки")).toHaveValue("Другой");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("ignores a stale completed processing run even when its sheet name matches", async () => {
    vi.useFakeTimers();
    const readRegistry = vi.fn().mockResolvedValueOnce(processing("Лист3", "new-run")).mockResolvedValue(registry({ processingRunId: "old-run" }));
    await restore(apiStub({ readRegistry })); await tick();
    expect(screen.getByText("Обработка листа")).toBeVisible(); expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    readRegistry.mockResolvedValue(registry({ processingRunId: "new-run" })); await tick();
    expect(screen.getByRole("radio")).toBeVisible();
  });
});
