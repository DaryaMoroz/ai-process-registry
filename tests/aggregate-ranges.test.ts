import { describe, expect, it } from "vitest";
import { readWorkbook } from "../src/server/registry/parser";
import { mapSheet } from "../src/server/registry/mapping";
import { formulaFacts } from "../src/server/registry/formulas";
import { RegistryService } from "../src/server/service";
import { escapeXml, literal, official, synthetic, tempStore } from "./helpers";

const map = (bytes: Uint8Array) => mapSheet(readWorkbook(bytes, "range.xlsx").readSheet("Лист3"), "v", "range.xlsx", "2026-01-01");
const formulaCell = (coordinate: string, formula: string, cachedValue = 12) => '<c r="' + coordinate + '"><f>' + escapeXml(formula.slice(1)) + '</f><v>' + cachedValue + '</v></c>';
describe("C. Generic aggregation uses rectangular range bounds", () => {
  it.each([
    "=SUM(K10:K11)", "=SUM(K10:L11)", "=SUM(J10:L11)", "=SUM($J10:L$11)", "=SUM($J$10:$L$11)",
    "=SUM(L11:J10)", "=SUM(K9:L11)", "=SUM(K:K)", "=SUM(10:11)", "=SUM('Лист 1'!$J10:L$11)",
    "=SUM('Лист 1'!$J10:'Лист 1'!L$11)",
    "=SUM((K10:L11))", "=IF(K9>0,SUM(K10:L11),0)", "=SUM(K10,K11)", "=(K10)+(K11)",
  ])("%s is generic AGGREGATE and creates no AnalysisUnit", formula => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Aggregate") + formulaCell("K9", formula), 11: literal("K11", 1) } }));
    expect(result.rows[0]).toMatchObject({ rowType: "AGGREGATE", genericRowType: "AGGREGATE", classificationOrigin: "GENERIC", scoringEligible: false, genericClassificationEvidence: ["K9"] });
    expect(result.processes).toHaveLength(0);
    expect(result.issues.some(i => i.code === "AGGREGATE_METRIC_FORMULA")).toBe(true);
  });
  it.each([
    '=LEN("K10:L11")', '="K10:L11"', '=LEN("say ""K10:L11""")', "=K9*2", "=SUM(K9:L9)",
    "=IF(K10>0,K11,0)", "=SUM(A10:B11)", "=SUM(Table1[[K10],[L11]])",
    "=INDEX(K10:L11,1,1)", "=INDEX(K10:K11,1)", "=LEN(K10:L11)", "=INDEX(K10:L11,1,1)+1",
    "=SUM(1)+INDEX(K10:L11,1,1)", "=SUM(INDEX(K10:L11,1,1))", "=SUM(INDEX(K10:L11,1,1),K9)",
    "=IF(K10>0,K11+1,0)", "=K10:L11+1", "=K10:K11+1", "=SUM(1)+K10:K11",
  ])("%s has no aggregate dependency on the metric in other rows", formula => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Process") + formulaCell("K9", formula) } }));
    expect(result.rows[0]).toMatchObject({ rowType: "PROCESS", classificationOrigin: "GENERIC" });
    expect(result.processes).toHaveLength(1);
    expect(result.issues.some(i => i.code === "AGGREGATE_METRIC_FORMULA")).toBe(false);
  });
  it("retains rectangle bounds without expanding even a full worksheet range", () => {
    const facts = formulaFacts("=SUM(A1:XFD1048576)");
    expect(facts.references).toHaveLength(2);
    expect(facts.ranges).toEqual([{ firstColumn: 1, lastColumn: 16384, firstRow: 1, lastRow: 1048576 }]);
    expect(formulaFacts('=LEN("A1:XFD1048576")').ranges).toEqual([]);
  });
  it("retains large lookup range bounds independently of aggregate operation evidence", () => {
    const lookup = formulaFacts("=INDEX(K10:XFD1048576,1,1)");
    expect(lookup.references).toHaveLength(2);
    expect(lookup.ranges).toEqual([{ firstColumn: 11, lastColumn: 16384, firstRow: 10, lastRow: 1048576 }]);
    expect(lookup.aggregations).toEqual([]);
    expect(formulaFacts("=SUM(K10:XFD1048576)").aggregations).toEqual([
      expect.objectContaining({ operation: "SUM", ranges: lookup.ranges }),
    ]);
  });
  it.each(["=INDEX(K10:L11,1,1)", "=INDEX(K10:K11,1)"])("persists a PROCESS AnalysisUnit for %s through parser/mapping/service/store", formula => {
    const storage = tempStore();
    try {
      const service = new RegistryService(storage.store);
      const metadata = service.upload(synthetic({ rows: {
        9: literal("D9", "Indexed process") + formulaCell("K9", formula, 4) + literal("L9", 12),
        10: literal("D10", "Process 10") + literal("K10", 4) + literal("L10", 12),
        11: literal("D11", "Process 11") + literal("K11", 5) + literal("L11", 13),
      } }), "index.xlsx");
      const run = service.selectSheet(metadata.registryVersionId, "Лист3");
      service.processSheet(metadata.registryVersionId, run.runId);
      const registry = service.readRegistry(metadata.registryVersionId), db = storage.store.read();
      expect(registry.canContinue).toBe(true);
      expect(registry.selectableProcesses).toHaveLength(3);
      const sheet = db.registries[metadata.registryVersionId].sheets["Лист3"];
      const row = sheet.rows[0];
      expect(row).toMatchObject({ rowType: "PROCESS", genericRowType: "PROCESS", scoringEligible: true, classificationOrigin: "GENERIC" });
      const process = Object.values(db.processes).find(p => p.sourceRowId === row.sourceRowId)!;
      expect(process.analysisUnit).toMatchObject({ unitType: "PRIMARY", status: "ACTIVE", scoringEligible: true, processId: process.processId, sourceRowId: row.sourceRowId });
      expect(process.facts.find(f => f.field === "hours_per_instance")?.value).toBe(4);
      expect(service.readProcess(process.processId).processName).toBe("Indexed process");
      expect(sheet.issues.some(i => i.row === 9 && i.code === "AGGREGATE_METRIC_FORMULA")).toBe(false);
      expect(registry.issues.some(i => i.code === "FORMULA_REFERENCE_OUTSIDE_TABLE")).toBe(false);
    } finally { storage.cleanup(); }
  });
  it("classifies a shared-formula dependent from its shifted mixed/absolute rectangle", () => {
    const result = map(synthetic({ rows: {
      9: literal("D9", "Master") + '<c r="K9"><f t="shared" si="7" ref="K9:K10">SUM($J11:L$12)</f><v>12</v></c>',
      10: literal("D10", "Dependent") + '<c r="K10"><f t="shared" si="7"/><v>99</v></c>',
    } }));
    const dependent = result.rows.find(r => r.excelRowNumber === 10)!;
    expect(dependent.cells.find(c => c.coordinate === "K10")).toMatchObject({ formula: "=SUM($J12:L$12)", cachedValue: 99, unsupportedFormula: false });
    expect(dependent).toMatchObject({ rowType: "AGGREGATE", classificationOrigin: "GENERIC" });
    expect(result.processes).toHaveLength(0);
  });
  it("keeps the authoritative official profile and row 14 PROCESS override", () => {
    const result = mapSheet(readWorkbook(official(), "Реестр МЛХ.xlsm").readSheet("Лист3"), "v", "official.xlsm", "2026-01-01");
    expect(result.rows.filter(r => r.rowType === "PROCESS").map(r => r.excelRowNumber)).toEqual([9, 10, 11, 12, 14, 17]);
    expect(result.rows.filter(r => r.rowType === "AGGREGATE").map(r => r.excelRowNumber)).toEqual([13, 15, 16]);
    expect(result.rows.find(r => r.excelRowNumber === 14)).toMatchObject({ genericRowType: "AGGREGATE", rowType: "PROCESS", classificationOrigin: "PROFILE" });
    expect(result.processes).toHaveLength(6);
  });
});
