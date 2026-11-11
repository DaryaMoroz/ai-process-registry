import { RESULT_CONTRACT_VERSION, type Slice02Snapshot, type ProcessCardView } from "./contracts";

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
// ISO 8601 timestamp; Date.parse alone silently normalizes impossible calendar dates.
const timestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= days[Number(month) - 1] &&
    Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59 &&
    (offsetHour === undefined || Number(offsetHour) <= 23 && Number(offsetMinute) <= 59) && Number.isFinite(Date.parse(value));
};
const axes = { value: ["V1", "V2", "V3", "V4", "V5"], feasibility: ["F1", "F2", "F3", "F4", "F5"] };
const ids = [...axes.value, ...axes.feasibility];
export function isProcessCardEnvelope(value: unknown): value is ProcessCardView {
  if (!object(value) || !text(value.processId) || !text(value.processName) || !object(value.sourceRegistry) || !object(value.scoreProcessing) || !Array.isArray(value.sourceFacts) || !Array.isArray(value.dataQualityIssues)) return false;
  const source = value.sourceRegistry, processing = value.scoreProcessing;
  if (![source.registryVersionId, source.fileName, source.sheetName].every(text) || !integer(source.rowNumber, 1, 1048576) || !["PENDING", "RUNNING", "AVAILABLE", "FAILED"].includes(String(processing.state))) return false;
  if (processing.error !== null && (!object(processing.error) || !text(processing.error.code) || !text(processing.error.message) || typeof processing.error.retryable !== "boolean")) return false;
  if (value.sourceFacts.some(f => !object(f) || !text(f.label) || !(f.value === null || ["string", "boolean"].includes(typeof f.value) || typeof f.value === "number" && Number.isFinite(f.value)) || !["Confirmed", "Derived", "Inferred", "Unknown"].includes(String(f.factStatus)) || !strings(f.sourceReferenceIds))) return false;
  return value.dataQualityIssues.every(i => object(i) && text(i.id) && text(i.code) && text(i.message) && ["INFO", "WARNING", "ERROR"].includes(String(i.severity)) && strings(i.sourceReferenceIds));
}
// Closed presentation checks A–F. No scoring arithmetic or counts from criterion rows.
export function isSlice02Snapshot(value: unknown): value is Slice02Snapshot {
  if (!object(value) || value.resultContractVersion !== RESULT_CONTRACT_VERSION || value.methodologyVersion !== "1.1" || value.stage !== "PRE_SCORE" || !text(value.scoreSnapshotId) || !text(value.inputSnapshotId) || !text(value.engineVersion) || !text(value.scoringConfigVersion)) return false;
  if (Object.hasOwn(value, "calculatedAt") && !timestamp(value.calculatedAt)) return false;
  const snapshotId = value.scoreSnapshotId;
  const concerns = new Map<string, { affected: string[]; kind: string }>();
  for (const [key, kind] of [["conflicts", "CONFLICT"], ["risks", "RISK"], ["blockers", "BLOCKER"]]) {
    const list = value[key];
    if (!Array.isArray(list)) return false;
    for (const concern of list) {
      if (!object(concern) || !text(concern.id) || concern.scoreSnapshotId !== snapshotId || concern.type !== kind || !text(concern.code) || !text(concern.description) || !text(concern.status) || typeof concern.confirmationState !== "string" || !["CONFIRMED", "UNCONFIRMED", "UNKNOWN", "NOT_APPLICABLE"].includes(concern.confirmationState) || !strings(concern.affectedCriterionIds) || concern.affectedCriterionIds.some(id => !ids.includes(id)) || !strings(concern.sourceReferenceIds) || concern.severity !== undefined && concern.severity !== null && !text(concern.severity)) return false;
      const identity = `${kind}:${concern.id}`;
      if (concerns.has(identity)) return false;
      concerns.set(identity, { affected: concern.affectedCriterionIds, kind });
    }
  }
  for (const [key, expectedIds] of Object.entries(axes)) {
    const axis = value[key];
    if (!object(axis) || axis.scoreSnapshotId !== snapshotId || axis.maxScore !== 25 || !integer(axis.knownCount, 0, 5) || !integer(axis.unknownCount, 0, 5) || axis.knownCount + axis.unknownCount !== 5 || axis.coverage !== [0, .2, .4, .6, .8, 1][axis.knownCount] || !integer(axis.knownSum, 0, 25)) return false;
    if (axis.knownCount < 5 ? axis.fullScore !== null : !integer(axis.fullScore, 5, 25)) return false;
    if (!Array.isArray(axis.range) || axis.range.length !== 2 || !integer(axis.range[0], 5, 25) || !integer(axis.range[1], 5, 25) || axis.range[0] > axis.range[1] || axis.knownCount === 5 && (axis.range[0] !== axis.fullScore || axis.range[1] !== axis.fullScore)) return false;
    if (!Array.isArray(axis.criteria) || axis.criteria.length !== 5) return false;
    const seen = new Set<string>();
    for (const criterion of axis.criteria) {
      if (!object(criterion) || !text(criterion.id) || !expectedIds.includes(criterion.id) || seen.has(criterion.id) || !text(criterion.label) || criterion.score !== null && !integer(criterion.score, 1, 5) || !text(criterion.explanation) || !text(criterion.ruleId) || !text(criterion.reasonCode) || !text(criterion.appliedRuleTrace) || !strings(criterion.missingInputs) || !strings(criterion.sourceReferenceIds) || !object(criterion.provenance) || criterion.provenance.scoreSnapshotId !== snapshotId || !strings(criterion.provenance.inputFactIds)) return false;
      if (criterion.score !== null && (!criterion.sourceReferenceIds.length || !criterion.provenance.inputFactIds.length)) return false;
      for (const [linkKey, kind] of [["conflictIds", "CONFLICT"], ["riskIds", "RISK"], ["blockerIds", "BLOCKER"]]) {
        const links = criterion[linkKey];
        if (!strings(links) || links.some(id => { const concern = concerns.get(`${kind}:${id}`); return !concern || concern.affected.length > 0 && !concern.affected.includes(criterion.id as string); })) return false;
      }
      seen.add(criterion.id);
    }
  }
  return true;
}
