import { describe, expect, it } from "vitest";
import { readWorkbook } from "../src/server/registry/parser";
import { translateFormula } from "../src/server/registry/formulas";
import { classify, mapSheet } from "../src/server/registry/mapping";
import { explicitRowType } from "../src/server/registry/profile";
import { official, OFFICIAL_CHECKSUM, synthetic, literal, escapeXml, mutateWorkbook } from "./helpers";

const now = "2026-01-01T00:00:00.000Z";
const read = (bytes: Uint8Array) => readWorkbook(bytes, "fixture.xlsx").readSheet("Лист3");
const map = (bytes: Uint8Array) => mapSheet(read(bytes), "v", "fixture.xlsx", now);

describe("shared formula facts, without recalculation", () => {
  it("retains the official master and resolves all dependents, with their own cached values", () => {
    const sheet = readWorkbook(official(), "Реестр МЛХ.xlsm").readSheet("Лист3");
    const cells = Object.values(sheet.rows).flat();
    const formula = (column: string, start: number, end: number) => "=" + Array.from({ length: end - start + 1 }, (_, i) => `${column}${start + i}`).join("+");
    for (const [coordinate, expectedFormula, cachedValue] of [
      ["K13", formula("K", 14, 26), 35], ["L13", formula("L", 14, 26), 2880],
      ["K14", formula("K", 15, 27), 17.5], ["L14", formula("L", 15, 27), 1440],
    ] as const) {
      expect(cells.find(c => c.coordinate === coordinate)).toMatchObject({ formula: expectedFormula, cachedValue,
        literalValue: null, cellType: "FORMULA", unsupportedFormula: false,
        formulaMetadata: { type: "shared", sharedIndex: "0", masterCoordinate: "K13", groupRef: "K13:L14" } });
    }
    expect(cells.find(c => c.coordinate === "K13")?.formulaMetadata).toMatchObject({ originalText: formula("K", 14, 26).slice(1), declaredRef: "K13:L14" });
    expect(cells.find(c => c.coordinate === "K14")?.formulaMetadata).toMatchObject({ originalText: "", declaredRef: null });
  });

  it.each([
    ["A1+$B2+C$3+$D$4", "B3+$B4+D$3+$D$4"],
    ["SUM(A1:B3,$C4:D$5)", "SUM(B3:C5,$C6:E$5)"],
    ["SUM(A:C,$D:$F,1:3,$4:$6)", "SUM(B:D,$D:$F,3:5,$4:$6)"],
    ["'Лист 1'!A1+Sheet2!$B2+[1]Sheet3!C$3", "'Лист 1'!B3+Sheet2!$B4+[1]Sheet3!D$3"],
    ["'O''Brien'!A1+Sheet1:Sheet3!A2", "'O''Brien'!B3+Sheet1:Sheet3!B4"],
    ['IF(A1="A1", "say ""B2""",LOG10(A2))+A1_name+ИмяA1', 'IF(B3="A1", "say ""B2""",LOG10(B4))+A1_name+ИмяA1'],
    ["Table1[[#Headers],[A1]]+A1+1E3", "Table1[[#Headers],[A1]]+B3+1E3"],
    ["XFD1048576+$XFD$1048576", "#REF!+$XFD$1048576"],
  ])("translates references without rewriting strings, names or qualifiers: %s", (formula, expected) => {
    expect(translateFormula(formula, "K9", "L11")).toBe(expected);
  });

  it("resolves dependents preceding the master, negative offsets and independent groups", () => {
    const bytes = synthetic({ rows: {
      9: '<c r="K9"><f t="shared" si="4"/><v>999</v></c><c r="L9"><f t="shared" si="4" ref="K9:L10">B2+$C$3</f><v>21</v></c>',
      10: '<c r="K10"><f t="shared" si="4"/><v>22</v></c>',
      11: '<c r="K11"><f t="shared" si="5" ref="K11:L11">D4</f><v>31</v></c><c r="L11"><f t="shared" si="5"/><v>32</v></c>',
    } });
    const sheet = read(bytes);
    expect(sheet.rows[9][0]).toMatchObject({ formula: "=A2+$C$3", rawValue: "999", cachedValue: 999, unsupportedFormula: false });
    expect(sheet.rows[10][0].formula).toBe("=A3+$C$3");
    expect(sheet.rows[11][1].formula).toBe("=E4");
    expect(translateFormula("A1+$A1+A$1+$A$1", "B2", "A1")).toBe("#REF!+#REF!+#REF!+$A$1");
  });

  it.each([
    ['', "SHARED_MASTER_MISSING_OR_AMBIGUOUS"],
    ['<c r="K9"><f t="shared" si="0" ref="K9:K10">A1</f><v>1</v></c>', "SHARED_REF_INVALID_OR_OUTSIDE"],
    ['<c r="K9"><f t="shared" si="0">A1</f><v>1</v></c>', "SHARED_REF_INVALID_OR_OUTSIDE"],
    ['<c r="K9"><f t="shared" si="0" ref="K9:L9">A1</f><v>1</v></c><c r="M9"><f t="shared" si="0" ref="L9:M9">B1</f><v>2</v></c>', "SHARED_MASTER_MISSING_OR_AMBIGUOUS"],
  ])("preserves unresolved formula and cache instead of inventing a master", (master, resolutionError) => {
    const cell = read(synthetic({ rows: { 9: master + '<c r="L9"><f t="shared" si="0"/><v>99</v></c>' } })).rows[9].find(c => c.coordinate === "L9");
    expect(cell).toMatchObject({ formula: "=", cachedValue: 99, literalValue: null, unsupportedFormula: true, formulaMetadata: { resolutionError } });
  });

  it("does not borrow a shared master from another worksheet", () => {
    let bytes = synthetic({ rows: { 9: '<c r="K9"><f t="shared" si="0" ref="K9:L9">A1</f><v>1</v></c>' }, extra: {
      "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="9"><c r="L9"><f t="shared" si="0"/><v>2</v></c></row></sheetData></worksheet>',
    } });
    bytes = mutateWorkbook(bytes, "xl/workbook.xml", xml => xml.replace("</sheets>", '<sheet name="Other" sheetId="2" r:id="rId2"/></sheets>'));
    bytes = mutateWorkbook(bytes, "xl/_rels/workbook.xml.rels", xml => xml.replace("</Relationships>", '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'));
    expect(readWorkbook(bytes, "test.xlsx").readSheet("Other").rows[9][0]).toMatchObject({ unsupportedFormula: true, formulaMetadata: { resolutionError: "SHARED_MASTER_MISSING_OR_AMBIGUOUS" } });
  });
});

describe("explicit profile classification takes precedence over generic formula classification", () => {
  it("keeps row 14 PROCESS and preserves generic evidence and cached facts for its AnalysisUnit", () => {
    const sheet = readWorkbook(official(), "Реестр МЛХ.xlsm").readSheet("Лист3");
    const mapped = mapSheet(sheet, "v", "Реестр МЛХ.xlsm", now);
    const row = mapped.rows.find(r => r.excelRowNumber === 14)!;
    expect(classify(row.cells)).toEqual({ type: "AGGREGATE", evidence: ["K14", "L14"] });
    expect(row).toMatchObject({ rowType: "PROCESS", genericRowType: "AGGREGATE", classificationOrigin: "PROFILE", scoringEligible: true,
      classificationRuleId: "MLH_PROFILE_PROCESS_v1.0.0", genericClassificationEvidence: ["K14", "L14"] });
    expect(row.classificationEvidence[0]).toContain(OFFICIAL_CHECKSUM);
    const process = mapped.processes.find(p => p.sourceRowId === row.sourceRowId)!;
    expect(process.analysisUnit.unitType).toBe("PRIMARY");
    expect(process.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "hours_per_instance", value: 17.5, factStatus: "Confirmed" }),
      expect.objectContaining({ field: "annual_instances", value: 1440, factStatus: "Confirmed" }),
    ]));
    expect(process.sourceReferences.find(s => s.coordinate === "K14")).toMatchObject({ cachedValue: 17.5, valueOrigin: "formula_cached_value", formulaMetadata: { masterCoordinate: "K13" } });
    expect(explicitRowType(sheet, 18)).toBeUndefined();
    expect(explicitRowType({ ...sheet, name: "Other" }, 14)).toBeUndefined();
    expect(explicitRowType({ ...sheet, sourceChecksum: "different" }, 14)).toBeUndefined();
  });

  it("uses generic classification for a different source with shared aggregate formulas", () => {
    const formula = escapeXml("K15+K16");
    const result = map(synthetic({ rows: {
      13: literal("D13", "Агрегат") + `<c r="K13"><f t="shared" si="8" ref="K13:K14">${formula}</f><v>10</v></c>`,
      14: literal("D14", "Не нормативный процесс") + '<c r="K14"><f t="shared" si="8"/><v>20</v></c>',
    } }));
    expect(result.rows.find(r => r.excelRowNumber === 14)).toMatchObject({ rowType: "AGGREGATE", genericRowType: "AGGREGATE", classificationOrigin: "GENERIC" });
    expect(result.processes).toHaveLength(0);
  });

  it("supports more than six processes and never applies official row positions globally", () => {
    const rows = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 9, literal(`D${i + 9}`, `Процесс ${i}`)]));
    const result = map(synthetic({ rows }));
    expect(result.processes).toHaveLength(12);
    expect(result.rows.every(r => r.rowType === "PROCESS" && r.classificationOrigin === "GENERIC")).toBe(true);
    expect(new Set(result.processes.map(p => p.analysisUnit.analysisUnitId)).size).toBe(12);
  });
});
