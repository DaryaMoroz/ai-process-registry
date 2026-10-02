// @vitest-environment jsdom
import "./setup";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProcessPage } from "../../src/features/process/ProcessPage";
import { ScoreAxisCard } from "../../src/features/process/components";
import { SourceDrawer } from "../../src/features/source/SourceDrawer";
import { apiStub, card, deferred } from "./helpers";
import { derivedSource, registrySource } from "../fixtures/contracts";
import type { ProcessCardView } from "../../src/shared/contracts";

const pending = (state: "PENDING" | "RUNNING" = "PENDING") => card({ activeScoreSnapshot: null, scoreProcessing: { state, error: null } });
const failed = (retryable: boolean) => card({ activeScoreSnapshot: null, scoreProcessing: { state: "FAILED", error: { code: "TEST_FAILED", message: "Безопасная ошибка расчёта", retryable } } });
const mount = async (api: ReturnType<typeof apiStub>) => { let result!: ReturnType<typeof render>; await act(async () => { result = render(<ProcessPage processId="internal-process-1" api={api} />); }); return result; };
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(400); });

describe("FE-20–28 / FX-07–15: backend-assembled card and honest partial PRE-SCORE", () => {
  it("card loading is separate from scoring; a loading error offers a safe retry", async () => {
    const response = deferred<ProcessCardView>();
    const api = apiStub({ openProcess: vi.fn(() => response.promise) });
    render(<ProcessPage processId="internal-process-1" api={api} />);
    expect(screen.getByText("Загрузка карточки процесса…")).toBeVisible();
    await act(async () => { response.reject(new Error("Карточка временно недоступна")); });
    expect(screen.getByRole("alert")).toHaveTextContent("Карточка временно недоступна");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });
  it.each(["PENDING", "RUNNING"] as const)("FX-07/08/12 %s keeps header/DQ without snapshot or fabricated stage", async state => {
    await mount(apiStub({ openProcess: vi.fn(async () => pending(state)) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Тестовый процесс");
    expect(screen.getByText("Замечание к данным")).toBeVisible();
    const label = state === "PENDING" ? "Расчёт PRE-SCORE ожидает запуска…" : "Расчёт PRE-SCORE выполняется…";
    expect(screen.getAllByText(label)).toHaveLength(2);
    expect(screen.queryByText("PRE-SCORE", { selector: ".badge" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Известная сумма/)).not.toBeInTheDocument();
  });
  it("FX-07 → FX-08 → FX-09 polls backend states and activates only its supplied snapshot", async () => {
    vi.useFakeTimers();
    const readProcess = vi.fn().mockResolvedValueOnce(pending("RUNNING")).mockResolvedValue(card());
    const api = apiStub({ openProcess: vi.fn(async () => pending()), readProcess });
    await mount(api); await tick();
    expect(screen.getAllByText("Расчёт PRE-SCORE выполняется…")).toHaveLength(2);
    await tick();
    expect(screen.getByText("PRE-SCORE", { selector: ".badge" })).toBeVisible();
    expect(screen.getByText("13–25")).toBeVisible();
    await tick(); expect(readProcess).toHaveBeenCalledTimes(2); expect(api.openProcess).toHaveBeenCalledTimes(1);
  });
  it("FX-09/13 renders range, known sum and coverage as opaque backend values; null is —", async () => {
    const result = card();
    // These opaque read-model values deliberately do not mirror criterion arithmetic.
    result.activeScoreSnapshot!.value = { ...result.activeScoreSnapshot!.value, knownSum: 18, coverage: 0.8, range: [19, 23] };
    await mount(apiStub({ openProcess: vi.fn(async () => result) }));
    expect(screen.getByText("19–23")).toBeVisible();
    const valueAxis = screen.getByRole("heading", { name: "Ценность" }).closest("section")!;
    expect(within(valueAxis).getByText(/Известная сумма:/)).toHaveTextContent("18");
    expect(screen.getByText(/^80\s*%$/, { selector: "strong" })).toBeVisible();
    expect(screen.queryByText(/18\s*\/\s*25/)).not.toBeInTheDocument();
    const missing = screen.getByText("V3").closest("li")!;
    expect(within(missing).getByText("—")).toBeInTheDocument();
    expect(missing).toHaveTextContent("manual_work_share_percent");
    expect(screen.getByText("Качество данных").closest("section")).not.toHaveTextContent("manual_work_share_percent");
    expect(screen.getByText("V1_FREQUENCY_v1.1")).toBeInTheDocument();
    expect(screen.getByText("Расчёт от backend")).toBeInTheDocument();
  });
  it("a full result and a missing range are rendered directly from their contracts", () => {
    const axis = card().activeScoreSnapshot!.value;
    const view = render(<ScoreAxisCard label="Ценность" axis={{ ...axis, fullScore: 20 }} onSource={() => {}} />);
    expect(screen.getByText("20", { selector: ".axis-number" })).toBeVisible();
    expect(screen.queryByText(/Известная сумма/)).not.toBeInTheDocument();
    view.rerender(<ScoreAxisCard label="Ценность" axis={{ ...axis, fullScore: null, range: null }} onSource={() => {}} />);
    expect(screen.getByText("—", { selector: ".axis-number" })).toBeVisible();
    expect(view.container.querySelector(".axis-max")).not.toBeInTheDocument();
  });
  it.each([true, false])("FX-10/11 FAILED retryable=%s retains card/DQ and respects retry permission", async retryable => {
    await mount(apiStub({ openProcess: vi.fn(async () => failed(retryable)) }));
    expect(screen.getByText("Замечание к данным")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Безопасная ошибка расчёта");
    expect(screen.queryByText("PRE-SCORE", { selector: ".badge" })).not.toBeInTheDocument();
    if (retryable) expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    else expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });
  it("explicit retry refreshes lifecycle without resetting card/DQ or calculating on client", async () => {
    vi.useFakeTimers();
    const api = apiStub({ openProcess: vi.fn().mockResolvedValueOnce(failed(true)).mockResolvedValue(pending()),
      retryScore: vi.fn(async () => pending()), readProcess: vi.fn(async () => card()) });
    await mount(api);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Повторить" })); });
    expect(api.retryScore).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Замечание к данным")).toBeVisible();
    await tick(); expect(screen.getByText("13–25")).toBeVisible();
  });
  it("reopening an available card does not call RetryProcessPreScore or poll", async () => {
    vi.useFakeTimers();
    const api = apiStub(); const view = await mount(api); view.unmount(); await mount(api); await tick();
    expect(api.openProcess).toHaveBeenCalledTimes(2);
    expect(api.readProcess).not.toHaveBeenCalled(); expect(api.retryScore).not.toHaveBeenCalled();
    expect(screen.getByText("13–25")).toBeVisible();
  });
  it("stale card response after unmount is ignored", async () => {
    const response = deferred<ProcessCardView>(); const api = apiStub({ openProcess: vi.fn(() => response.promise) });
    const view = await mount(api); view.unmount();
    await act(async () => { response.resolve(card()); });
    expect(screen.queryByText("Тестовый процесс")).not.toBeInTheDocument();
  });

  it("FX-14 source drawer renders Registry/Confirmed separately and restores trigger focus", async () => {
    const api = apiStub(); await mount(api);
    const trigger = within(screen.getByRole("heading", { level: 1 }).closest("header")!).getByRole("button", { name: /^Источник$/ }); trigger.focus();
    await act(async () => { fireEvent.click(trigger); });
    expect(api.readSource).toHaveBeenCalledWith("registry-source");
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("registry")).toBeVisible(); expect(within(drawer).getByText("Confirmed")).toBeVisible();
    expect(within(drawer).getByText("L14")).toBeVisible(); expect(within(drawer).getByText("1440")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть источник" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it("FX-15 Derived drawer shows backend trace and follows backend input source IDs", async () => {
    const api = apiStub({ readSource: vi.fn(async id => id === "derived-source" ? structuredClone(derivedSource) : structuredClone(registrySource)) });
    render(<SourceDrawer sourceReferenceId="derived-source" onClose={() => {}} api={api} />);
    await act(async () => {});
    expect(screen.getByText("calculated")).toBeVisible(); expect(screen.getByText("Derived")).toBeVisible();
    expect(screen.getByText("Backend derivation trace")).toBeVisible(); expect(screen.getByText("25200")).toBeVisible();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Источник 1" })); });
    expect(api.readSource).toHaveBeenLastCalledWith("registry-source"); expect(screen.getByText("Confirmed")).toBeVisible();
  });
  it("source loading/error/retry remain separate from the card and scoring", async () => {
    const response = deferred<typeof registrySource>();
    const api = apiStub({ readSource: vi.fn().mockReturnValueOnce(response.promise).mockResolvedValue(registrySource) });
    const close = vi.fn(); render(<SourceDrawer sourceReferenceId="registry-source" onClose={close} api={api} />);
    expect(screen.getByText("Загрузка источника…")).toBeVisible();
    await act(async () => { response.reject(new Error("Источник недоступен")); });
    expect(screen.getByRole("alert")).toHaveTextContent("Источник недоступен");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Повторить" })); });
    expect(screen.getByText("Confirmed")).toBeVisible();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
