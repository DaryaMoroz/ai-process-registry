import { describe, expect, it } from "vitest";
import { isSlice02Snapshot } from "../src/shared/scoreContract";
import { cardFixture, slice02SnapshotFixture } from "./fixtures/contracts";
import { fullAxisFixture, invalidScoreCases } from "./fixtures/slice02-contract";
describe("S02-T16/24–29: closed defensive contract checks, no frontend arithmetic", () => {
  it.each(invalidScoreCases)("rejects $name atomically without changing input", scenario => {
    const s = scenario.full ? fullAxisFixture() : structuredClone(slice02SnapshotFixture); scenario.mutate(s);
    const before = structuredClone(s); expect(isSlice02Snapshot(s)).toBe(false); expect(s).toEqual(before);
  });
  it("accepts complete and incomplete compatible fixtures", () => {
    expect(isSlice02Snapshot(slice02SnapshotFixture)).toBe(true); expect(isSlice02Snapshot(fullAxisFixture())).toBe(true);
  });
  it.each([{ bad: "value" }, null, 42, [], undefined, "", "not-a-date", "2026-02-30T00:00:00.000Z", "2026-10-05T25:00:00Z"].map(calculatedAt => ({ calculatedAt })))("B-02 rejects malformed calculatedAt $calculatedAt without mutation", ({ calculatedAt }) => {
    const snapshot = structuredClone(slice02SnapshotFixture);
    Object.assign(snapshot, { calculatedAt });
    const before = structuredClone(snapshot);
    expect(isSlice02Snapshot(snapshot)).toBe(false);
    expect(snapshot).toEqual(before);
  });
  it("B-02 accepts absent optional calculatedAt", () => {
    const snapshot = structuredClone(slice02SnapshotFixture);
    delete snapshot.calculatedAt;
    expect(isSlice02Snapshot(snapshot)).toBe(true);
    expect(Object.hasOwn(snapshot, "calculatedAt")).toBe(false);
  });
  it.each(["2026-10-05T00:00:00.000Z", "2026-10-05T03:00:00+03:00", "2024-02-29T12:30:00Z"])("B-02 accepts ISO 8601 calculatedAt %s", calculatedAt => {
    const snapshot = { ...structuredClone(slice02SnapshotFixture), calculatedAt };
    expect(isSlice02Snapshot(snapshot)).toBe(true);
    expect(snapshot.calculatedAt).toBe(calculatedAt);
  });
  it("B-02 other displayed metadata rejects objects without string coercion", () => {
    const snapshot = structuredClone(slice02SnapshotFixture);
    snapshot.risks.push({ id: "risk", scoreSnapshotId: snapshot.scoreSnapshotId, type: "RISK", code: "RISK_REQUIRES_VERIFICATION", description: "Проверить ограничение", status: "OPEN",
      confirmationState: "UNCONFIRMED", affectedCriterionIds: [], sourceReferenceIds: [] });
    Object.assign(snapshot.risks[0], { confirmationState: { toString: "UNCONFIRMED" } });
    const before = structuredClone(snapshot);
    expect(() => isSlice02Snapshot(snapshot)).not.toThrow(); expect(isSlice02Snapshot(snapshot)).toBe(false); expect(snapshot).toEqual(before);
    Object.assign(snapshot.risks[0], { confirmationState: "UNCONFIRMED", severity: { bad: "value" } });
    expect(isSlice02Snapshot(snapshot)).toBe(false);
  });
  it("legacy is not relabeled or padded", () => {
    const old = structuredClone(cardFixture.activeScoreSnapshot); expect(isSlice02Snapshot(old)).toBe(false);
    expect(old).toEqual(cardFixture.activeScoreSnapshot);
  });
  it("incomplete range and known sum are received values; client does not recompute", () => {
    const result = structuredClone(slice02SnapshotFixture); result.value.range = [5, 25]; result.value.knownSum = 25;
    expect(isSlice02Snapshot(result)).toBe(true); expect(result.value.range).toEqual([5, 25]);
  });
  it.each([null, undefined, {}, [], "snapshot", { value: null }, { resultContractVersion: "slice02.pre-score.v1", value: null }])("malformed payload %j is controlled", value => {
    expect(() => isSlice02Snapshot(value)).not.toThrow(); expect(isSlice02Snapshot(value)).toBe(false);
  });
});
