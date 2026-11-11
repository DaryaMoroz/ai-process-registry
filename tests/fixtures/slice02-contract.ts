import type { Slice02Snapshot } from "../../src/shared/contracts";
import { slice02SnapshotFixture } from "./contracts";
export function fullAxisFixture(): Slice02Snapshot {
  const result = structuredClone(slice02SnapshotFixture);
  result.value = { ...result.value, knownCount: 5, unknownCount: 0, coverage: 1, knownSum: 20, fullScore: 20, range: [20, 20],
    criteria: result.value.criteria.map(c => ({ ...c, score: 4, missingInputs: [], sourceReferenceIds: ["registry-source"], provenance: { scoreSnapshotId: result.scoreSnapshotId, inputFactIds: [`fact:${c.id}`] } })) };
  return result;
}
export const invalidScoreCases: { name: string; full?: boolean; mutate: (result: Slice02Snapshot) => void }[] = [
  { name: "T16-A cardinality", mutate: s => { s.value.unknownCount = 2; } },
  { name: "T16-B coverage", mutate: s => { s.value.coverage = .6; } },
  { name: "T16-C fullScore missing", full: true, mutate: s => { s.value.fullScore = null; } },
  { name: "T29-A maxScore", mutate: s => { s.value.maxScore = 24; } },
  { name: "T29-B full range", full: true, mutate: s => { s.value.range = [19, 20]; } },
  { name: "T29-C fullScore 3 on incomplete", mutate: s => { s.value.fullScore = 3; } },
  { name: "T29-C fullScore 10 on incomplete", mutate: s => { s.value.fullScore = 10; } },
  { name: "T29-D inverted range", mutate: s => { s.value.range = [18, 6]; } },
  { name: "T24 missing marker", mutate: s => { Reflect.deleteProperty(s, "resultContractVersion"); } },
  { name: "T24 unknown marker", mutate: s => { Object.assign(s, { resultContractVersion: "future" }); } },
  { name: "T24 missing actual engine", mutate: s => { s.engineVersion = ""; } },
  { name: "T24 missing config", mutate: s => { s.scoringConfigVersion = ""; } },
  { name: "T24 wrong methodology", mutate: s => { s.methodologyVersion = "2.0"; } },
  { name: "T24 wrong stage", mutate: s => { s.stage = "INTERVIEW_SCORE"; } },
  { name: "T25 axis snapshot", mutate: s => { s.value.scoreSnapshotId = "another"; } },
  { name: "T25 criterion snapshot", mutate: s => { s.value.criteria[0].provenance.scoreSnapshotId = "another"; } },
  { name: "T25 concern snapshot", mutate: s => { s.risks.push({ id: "risk", scoreSnapshotId: "another", type: "RISK", code: "RISK_REQUIRES_VERIFICATION", description: "Backend concern", status: "OPEN", affectedCriterionIds: [], confirmationState: "UNCONFIRMED", sourceReferenceIds: [] }); } },
  { name: "T26 duplicate criterion", mutate: s => { s.value.criteria[1].id = "V1"; } },
  { name: "T27 missing criterion", mutate: s => { s.feasibility.criteria.pop(); } },
  { name: "T28 unknown criterion", mutate: s => { s.value.criteria[0].id = "X1"; } },
  { name: "T28 wrong axis", mutate: s => { s.value.criteria[0].id = "F1"; } },
  { name: "T29 missing range", mutate: s => { Reflect.deleteProperty(s.value, "range"); } },
  { name: "T29 missing count", mutate: s => { Reflect.deleteProperty(s.value, "knownCount"); } },
  { name: "T29 knownSum bounds", mutate: s => { s.value.knownSum = 26; } },
  { name: "T29 fractional score", mutate: s => { s.value.criteria[0].score = 1.5; } },
  { name: "T29 zero score", mutate: s => { s.value.criteria[0].score = 0; } },
  { name: "T29 wrong count type", mutate: s => { Object.assign(s.value, { unknownCount: "3" }); } },
  { name: "T29 missing trace", mutate: s => { s.value.criteria[2].appliedRuleTrace = ""; } },
  { name: "T29 missing reason", mutate: s => { s.value.criteria[2].reasonCode = ""; } },
  { name: "T29 missing explanation", mutate: s => { s.value.criteria[2].explanation = ""; } },
  { name: "T29 missing rule", mutate: s => { s.value.criteria[2].ruleId = ""; } },
  { name: "T29 dangling concern", mutate: s => { s.value.criteria[0].riskIds = ["missing"]; } },
  { name: "T29 numeric without evidence", mutate: s => { s.value.criteria[0].sourceReferenceIds = []; } },
  { name: "T29 numeric without input facts", mutate: s => { s.value.criteria[0].provenance.inputFactIds = []; } },
];
