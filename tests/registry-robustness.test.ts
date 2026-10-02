import { describe, expect, it } from "vitest";
import { readWorkbook } from "../src/server/registry/parser";
import { mapSheet } from "../src/server/registry/mapping";
import { formulaFacts } from "../src/server/registry/formulas";
import { REGISTRY_LIMITS } from "../src/server/registry/limits";
import { escapeXml, literal, mutateWorkbook, synthetic } from "./helpers";

const now = "2026-01-01T00:00:00Z";
const read = (bytes: Uint8Array) => readWorkbook(bytes, "test.xlsx").readSheet("Лист3");

describe("generic formula classification uses lexical references, not quoted text", () => {
  it.each([
    ['=LEN("K10+K11")', "PROCESS", []],
    ['="A1+B2"', "PROCESS", []],
    ['=IF(A1>0,"B2+C3","D4")', "PROCESS", [{ column: "A", row: 1 }]],
    ['=SUM(K10:K11)', "AGGREGATE", [{ column: "K", row: 10 }, { column: "K", row: 11 }]],
    ['=IF(L9>0,"SUM(K10:K11)","K12+K13")', "PROCESS", [{ column: "L", row: 9 }]],
    ['=LEN("say ""K10+K11""")', "PROCESS", []],
    ['=K10+K11', "AGGREGATE", [{ column: "K", row: 10 }, { column: "K", row: 11 }]],
  ])("%s → %s without literal aggregate evidence", (formula, rowType, references) => {
    const bytes = synthetic({ rows: { 9: literal("D9", "Процесс") + `<c r="K9"><f>${escapeXml(formula.slice(1))}</f><v>7</v></c>` + literal("L9", 12) } });
    const result = mapSheet(read(bytes), "v", "test.xlsx", now);
    expect(formulaFacts(formula).references).toEqual(references);
    expect(result.rows[0].rowType).toBe(rowType);
    expect(result.rows[0].classificationOrigin).toBe("GENERIC");
    expect(result.processes).toHaveLength(rowType === "PROCESS" ? 1 : 0);
    if (rowType === "PROCESS") expect(result.issues.some(i => i.code === "AGGREGATE_METRIC_FORMULA")).toBe(false);
    if (references.length === 0) expect(result.issues.some(i => i.code === "FORMULA_REFERENCE_OUTSIDE_TABLE")).toBe(false);
  });
  it("ignores cell-like text in quoted sheet names and structured references", () => {
    expect(formulaFacts("'K10+K11'!A9+Table1[[K12],[K13]]")).toMatchObject({ references: [{ column: "A", row: 9 }], external: true });
  });
});

describe("worksheet-aware resource limits precede analytical materialization", () => {
  const limits = { ...REGISTRY_LIMITS, maxTableRowSpan: 4 };
  it("preserves ordinary sparse gaps as EMPTY within the budget", () => {
    const result = mapSheet(read(synthetic({ rows: { 9: literal("D9", "Первый"), 12: literal("D12", "Второй") } })), "v", "test.xlsx", now, limits);
    expect(result.rows.map(r => [r.excelRowNumber, r.rowType])).toEqual([[9, "PROCESS"], [10, "EMPTY"], [11, "EMPTY"], [12, "PROCESS"]]);
    expect(result.sources).toHaveLength(4 * 19);
    expect(result.processes).toHaveLength(2);
  });
  it.each([3, 4])("accepts table span %s at/below configured limit", span => {
    const result = mapSheet(read(synthetic({ rows: { [8 + span]: literal(`D${8 + span}`, "Процесс") } })), "v", "test.xlsx", now, limits);
    expect(result.rows).toHaveLength(span);
    expect(result.sources).toHaveLength(span * 19);
  });
  it("rejects span one row over the limit with explicit diagnostics", () => {
    expect(() => mapSheet(read(synthetic({ rows: { 13: literal("D13", "Процесс") } })), "v", "test.xlsx", now, limits))
      .toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT", message: expect.stringContaining("maxTableRowSpan (5 > 4)") }));
  });
  it("rejects a tiny pathological sparse ZIP instead of creating millions of intermediate objects", () => {
    const bytes = synthetic({ rows: { 1048576: literal("D1048576", "Процесс") } });
    expect(bytes.length).toBeLessThan(3000);
    const sheet = read(bytes);
    expect(Object.keys(sheet.rows)).toHaveLength(2); // header + the one actual data row
    expect(() => mapSheet(sheet, "v", "test.xlsx", now)).toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT" }));
    expect(Object.keys(sheet.rows)).toHaveLength(2);
  });
  it("does not count distant styled/unmapped cells as table expansion", () => {
    const result = mapSheet(read(synthetic({ rows: { 9: literal("D9", "Процесс"), 1048576: '<c r="A1048576" s="1"/>' + literal("T1048576", "unmapped") } })), "v", "test.xlsx", now, limits);
    expect(result.rows).toHaveLength(1);
  });
  it.each([1, 2])("checks actual worksheet row count budget %s", maxWorksheetRows => {
    const bytes = synthetic();
    const book = readWorkbook(bytes, "test.xlsx", { ...REGISTRY_LIMITS, maxWorksheetRows });
    if (maxWorksheetRows === 1) expect(() => book.readSheet("Лист3")).toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT", message: expect.stringContaining("maxWorksheetRows") }));
    else expect(Object.keys(book.readSheet("Лист3").rows)).toHaveLength(2);
  });
  it.each([23, 24])("checks actual worksheet cell count budget %s", maxWorksheetCells => {
    const book = readWorkbook(synthetic(), "test.xlsx", { ...REGISTRY_LIMITS, maxWorksheetCells });
    if (maxWorksheetCells === 23) expect(() => book.readSheet("Лист3")).toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT", message: expect.stringContaining("maxWorksheetCells") }));
    else expect(book.readSheet("Лист3").rows[9]).toHaveLength(5);
  });
  it("enforces ZIP budgets without treating dimension as data", () => {
    expect(() => readWorkbook(synthetic(), "test.xlsx", { ...REGISTRY_LIMITS, maxZipEntries: 3 })).toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT" }));
    expect(() => readWorkbook(synthetic(), "test.xlsx", { ...REGISTRY_LIMITS, maxExpandedBytes: 100 })).toThrow(expect.objectContaining({ code: "WORKBOOK_RESOURCE_LIMIT" }));
  });
});

describe("malformed ZIP/XML and worksheet structure produce controlled errors", () => {
  it("rejects corrupt ZIP and missing sheets", () => {
    expect(() => readWorkbook(new Uint8Array([80, 75, 3, 4]), "test.xlsx")).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
    expect(() => readWorkbook(synthetic(), "test.xlsx").readSheet("missing")).toThrow(expect.objectContaining({ code: "MAPPING_SHEET_NOT_FOUND" }));
  });
  it.each([
    () => '<worksheet><sheetData></worksheet>',
    () => '<worksheet><dimension ref="A1:S10"/></worksheet>',
    () => '<worksheet><sheetData><row r="9"><c r="D10"><v>1</v></c></row></sheetData></worksheet>',
    () => '<worksheet><sheetData><row r="9"><c r="D9"/><c r="D9"/></row></sheetData></worksheet>',
    () => '<worksheet><sheetData><row r="9"/><row r="9"/></sheetData></worksheet>',
    () => '<!DOCTYPE worksheet [<!ENTITY x "text">]><worksheet><sheetData/></worksheet>',
  ])("rejects unexpected worksheet XML", update => {
    const bytes = mutateWorkbook(synthetic(), "xl/worksheets/sheet1.xml", update);
    expect(() => read(bytes)).toThrow(expect.objectContaining({ code: "INVALID_WORKSHEET" }));
  });
  it("rejects workbook relationships escaping xl instead of extracting paths", () => {
    const bytes = mutateWorkbook(synthetic(), "xl/_rels/workbook.xml.rels", xml => xml.replace("worksheets/sheet1.xml", "../../outside.xml"));
    expect(() => readWorkbook(bytes, "test.xlsx")).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
  });
});
