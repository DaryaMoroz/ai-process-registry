// @vitest-environment jsdom
import "./setup";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProcessPage } from "../../src/features/process/ProcessPage";
import { apiStub, card, deferred } from "./helpers";
import { fullAxisFixture, invalidScoreCases } from "../fixtures/slice02-contract";
import { cardFixture } from "../fixtures/contracts";
import type { ProcessCardView } from "../../src/shared/contracts";
const mount = async (result: ProcessCardView) => {
  const api = apiStub({ openProcess: vi.fn(async () => result) }); let view!: ReturnType<typeof render>;
  await act(async () => { view = render(<ProcessPage processId={result.processId} api={api} />); });
  return { view, api };
};

describe("S02 frontend: ten results, defensive A–F, atomic presentation", () => {
  it.each([{ bad: "value" }, "not-a-date", null])("B-02 malformed calculatedAt %j rejects score atomically and retains the card", async calculatedAt => {
    const result = card(); Object.assign(result.activeScoreSnapshot!, { calculatedAt });
    const before = structuredClone(result), { api } = await mount(result);
    expect(screen.getByRole("alert")).toHaveTextContent("данные результата не соответствуют контракту");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(result.processName);
    expect(screen.getByText("Замечание к данным")).toBeVisible();
    fireEvent.click(screen.getByText("Исходные факты реестра"));
    expect(screen.getByText("Факт реестра")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Ценность" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Реализуемость" })).not.toBeInTheDocument();
    expect(screen.queryByText("V1")).not.toBeInTheDocument(); expect(screen.queryByText("F1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "О расчёте" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
    expect(api.retryScore).not.toHaveBeenCalled(); expect(api.readProcess).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Расчёт доступен"); expect(result).toEqual(before);
  });
  it.each([undefined, "2026-10-05T00:00:00.000Z"])("B-02 optional/valid calculatedAt %s renders without repair", async calculatedAt => {
    const result = card();
    if (calculatedAt === undefined) delete result.activeScoreSnapshot!.calculatedAt;
    else result.activeScoreSnapshot!.calculatedAt = calculatedAt;
    const before = structuredClone(result), { api } = await mount(result);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("V1")).toBeVisible(); expect(screen.getByText("F1")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "О расчёте" }));
    const timestamp = screen.getByText("Время расчёта").nextElementSibling;
    expect(timestamp).toHaveTextContent(calculatedAt ?? "—");
    expect(api.retryScore).not.toHaveBeenCalled(); expect(result).toEqual(before);
  });
  it("B-02 malformed concern metadata uses controlled score rejection", async () => {
    const result = card(), snapshot = result.activeScoreSnapshot!;
    snapshot.risks = [{ id: "risk", scoreSnapshotId: snapshot.scoreSnapshotId, type: "RISK", code: "RISK_REQUIRES_VERIFICATION", description: "Проверить ограничение", status: "OPEN",
      confirmationState: "UNCONFIRMED", affectedCriterionIds: [], sourceReferenceIds: [] }];
    Object.assign(snapshot.risks[0], { confirmationState: { toString: "UNCONFIRMED" } });
    const before = structuredClone(result), { api } = await mount(result);
    expect(screen.getByRole("alert")).toHaveTextContent("данные результата не соответствуют контракту");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(result.processName);
    expect(screen.getByText("Замечание к данным")).toBeVisible(); expect(screen.getByText("Факт реестра")).toBeInTheDocument();
    expect(screen.queryByText("V1")).not.toBeInTheDocument(); expect(screen.queryByText("F1")).not.toBeInTheDocument();
    expect(api.retryScore).not.toHaveBeenCalled(); expect(result).toEqual(before);
    expect(screen.getByRole("status")).toHaveTextContent("Расчёт доступен");
  });
  it.each(invalidScoreCases)("$name hides both axes, retains header/source/DQ, does not retry or mutate lifecycle", async scenario => {
    const result = card(); if (scenario.full) result.activeScoreSnapshot = fullAxisFixture(); scenario.mutate(result.activeScoreSnapshot as ReturnType<typeof fullAxisFixture>);
    const before = structuredClone(result), { api } = await mount(result);
    expect(screen.getByRole("alert")).toHaveTextContent("данные результата не соответствуют контракту");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(result.processName);
    expect(screen.getByText("Замечание к данным")).toBeVisible(); expect(screen.getByText("Факт реестра")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ценность" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Реализуемость" })).not.toBeInTheDocument();
    expect(screen.queryByText("V1")).not.toBeInTheDocument(); expect(screen.queryByText("F1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "О расчёте" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
    expect(api.retryScore).not.toHaveBeenCalled(); expect(api.readProcess).not.toHaveBeenCalled(); expect(result).toEqual(before);
    expect(screen.getByRole("status")).toHaveTextContent("Расчёт доступен");
  });
  it("S02-T01/03/11/12/14/17: renders all ten backend results, partial semantics and 0/5 as range", async () => {
    await mount(card());
    for (const id of ["V1", "V2", "V3", "V4", "V5", "F1", "F2", "F3", "F4", "F5"]) expect(screen.getByText(id)).toBeVisible();
    expect(screen.getAllByText("Нет оценки")).toHaveLength(8);
    expect(screen.getByText("Оценены 2 из 5 · Без оценки 3")).toBeVisible(); expect(screen.getByText("Оценены 0 из 5 · Без оценки 5")).toBeVisible();
    expect(screen.getByText("5–25")).toBeVisible(); expect(screen.queryByText(/0\s*\/\s*25/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Возможный диапазон при текущей полноте данных")).toHaveLength(2);
    expect(screen.getByText(/Это не вероятностный прогноз/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });
  it("S02-T13: full axis uses returned fullScore and collapsed range without local summation", async () => {
    await mount(card({ activeScoreSnapshot: fullAxisFixture() }));
    const axis = screen.getByRole("heading", { name: "Ценность" }).closest("section")!;
    expect(within(axis).getByText("20", { selector: ".axis-number" })).toBeVisible();
    expect(within(axis).getByText("Полная оценка оси")).toBeVisible();
    expect(within(axis).queryByText(/Известная сумма/)).not.toBeInTheDocument();
  });
  it("S02-T30: unknown F1 and confirmed no-access score are distinct backend results", async () => {
    const unknown = await mount(card());
    expect(within(screen.getByText("F1").closest("li")!).getByText("Нет оценки")).toBeVisible();
    unknown.view.unmount();
    const result = card(), axis = result.activeScoreSnapshot!.feasibility;
    Object.assign(axis, { knownCount: 1, unknownCount: 4, knownSum: 1, coverage: .2, range: [5, 21] });
    Object.assign(axis.criteria[0], { score: 1, explanation: "Подтверждено отсутствие доступа", reasonCode: "WEAK_LINK_MINIMUM", missingInputs: [], sourceReferenceIds: ["registry-source"],
      provenance: { scoreSnapshotId: result.activeScoreSnapshot!.scoreSnapshotId, inputFactIds: ["access-fact"] } });
    await mount(result);
    const f1 = within(screen.getByText("F1").closest("li")!);
    expect(f1.getByText("1")).toBeVisible(); expect(f1.queryByText("Нет оценки")).not.toBeInTheDocument();
    expect(f1.getByText("Подтверждено отсутствие доступа")).toBeVisible(); expect(screen.getByText("5–21")).toBeVisible();
  });
  it("S02-T07/08: risk and conflict remain separate from DQ and technical lifecycle errors", async () => {
    const result = card(), snapshot = result.activeScoreSnapshot!;
    snapshot.risks = [{ id: "risk", scoreSnapshotId: snapshot.scoreSnapshotId, type: "RISK", code: "RISK_REQUIRES_VERIFICATION", description: "Проверить ограничение",
      status: "OPEN", affectedCriterionIds: ["F2"], confirmationState: "UNCONFIRMED", sourceReferenceIds: [] }];
    snapshot.conflicts = [{ id: "conflict", scoreSnapshotId: snapshot.scoreSnapshotId, type: "CONFLICT", code: "CONFIRMED_SOURCE_CONFLICT", description: "Источники противоречат друг другу",
      status: "OPEN", affectedCriterionIds: ["V3"], confirmationState: "CONFIRMED", sourceReferenceIds: ["registry-source"] }];
    snapshot.feasibility.criteria[1].riskIds = ["risk"]; snapshot.value.criteria[2].conflictIds = ["conflict"];
    const { api } = await mount(result);
    expect(screen.getByText("Проверить ограничение")).toBeVisible(); expect(screen.getByText("Источники противоречат друг другу")).toBeVisible();
    expect(screen.getByText("Замечание к данным")).toBeVisible(); expect(screen.getByText("Расчёт доступен")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); expect(api.retryScore).not.toHaveBeenCalled();
    expect(screen.getByText("V1").closest("li")).toHaveTextContent("5");
  });
  it("S02-T23: legacy AVAILABLE is rejected as incompatible, not adapted", async () => {
    const { api } = await mount(structuredClone(cardFixture));
    expect(screen.getByRole("alert")).toHaveTextContent("контракту"); expect(screen.queryByText("F1")).not.toBeInTheDocument();
    expect(api.retryScore).not.toHaveBeenCalled(); expect(cardFixture.activeScoreSnapshot!.feasibility.criteria).toEqual([]);
  });
  it("S02-T09/22/35/37: independent concerns, accessible disclosure, actual provenance", async () => {
    const result = card(), snapshot = result.activeScoreSnapshot!;
    snapshot.blockers = [{ id: "stop", scoreSnapshotId: snapshot.scoreSnapshotId, type: "BLOCKER", code: "LEGAL_INFOSEC_PDN_BLOCK", description: "Подтверждённый стоп-фактор",
      status: "CONFIRMED", affectedCriterionIds: ["V1"], confirmationState: "CONFIRMED", sourceReferenceIds: ["registry-source"] }];
    snapshot.value.criteria[0].blockerIds = ["stop"];
    await mount(result);
    expect(screen.getByRole("heading", { name: "Риски" })).toBeVisible(); expect(screen.getByRole("heading", { name: "Конфликты" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Стоп-факторы" })).toBeVisible(); expect(screen.getByText("Подтверждённый стоп-фактор")).toBeVisible();
    const c = screen.getByText("V1").closest("li")!, disclosure = within(c).getByRole("button", { name: "Обоснование и источники" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false"); fireEvent.click(disclosure); expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(within(c).getByRole("link", { name: /stop/ })).toHaveAttribute("href", "#concern-stop");
    expect(within(c).getByText("Backend trace V1")).toBeVisible(); expect(within(c).getByText("5")).toBeVisible();
    const about = screen.getByRole("button", { name: "О расчёте" }); fireEvent.click(about);
    expect(about).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("fixture-config-content-identity")).toBeVisible(); expect(screen.getByText("slice-02-engine-1")).toBeVisible();
  });
  it("S02-T25: late previous card response cannot replace the current card", async () => {
    const old = deferred<ProcessCardView>(), api = apiStub({ openProcess: vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue({ ...card(), processId: "second", processName: "Второй процесс" }) });
    const view = render(<ProcessPage processId="first" api={api} />);
    await act(async () => { view.rerender(<ProcessPage processId="second" api={api} />); });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Второй процесс");
    await act(async () => { old.resolve({ ...card(), processId: "first", processName: "Старый процесс" }); });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Второй процесс");
  });
  it("S02-T36: source error leaves AVAILABLE score, header and DQ intact", async () => {
    const api = apiStub({ readSource: vi.fn(async () => { throw new Error("Источник временно недоступен"); }) });
    await act(async () => { render(<ProcessPage processId="internal-process-1" api={api} />); });
    const trigger = within(screen.getByRole("heading", { level: 1 }).closest("header")!).getByRole("button", { name: /^Источник$/ });
    await act(async () => { fireEvent.click(trigger); });
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Источник временно недоступен");
    expect(screen.getByText("13–25")).toBeVisible(); expect(screen.getByText("5–25")).toBeVisible();
    expect(screen.getByText("Замечание к данным")).toBeVisible(); expect(api.retryScore).not.toHaveBeenCalled();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(screen.getByText("Расчёт доступен")).toBeVisible();
  });
  it("malformed card envelope uses safe card-load error", async () => {
    const result = card(); Object.assign(result, { sourceRegistry: null });
    await mount(result); expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить карточку");
    expect(screen.queryByText("V1")).not.toBeInTheDocument();
  });
  it("changing process hides previous score while new card loads", async () => {
    const response = deferred<ProcessCardView>(), api = apiStub({ openProcess: vi.fn().mockResolvedValueOnce(card()).mockReturnValueOnce(response.promise) });
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<ProcessPage processId="internal-process-1" api={api} />); });
    expect(screen.getByText("13–25")).toBeVisible();
    await act(async () => { view.rerender(<ProcessPage processId="next" api={api} />); });
    expect(screen.queryByText("13–25")).not.toBeInTheDocument(); expect(screen.getByText("Загрузка карточки процесса…")).toBeVisible();
    await act(async () => { response.resolve({ ...card(), processId: "next", processName: "Следующий процесс" }); });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Следующий процесс");
  });
});
