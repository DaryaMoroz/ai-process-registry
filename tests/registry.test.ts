import { describe, it, expect } from "vitest";
import { readWorkbook } from "../src/server/registry/parser";
import { mapSheet } from "../src/server/registry/mapping";
import { fingerprint, sha256, sourceRowId } from "../src/server/identity";
import { columns } from "../src/server/registry/profile";
import { official, OFFICIAL_CHECKSUM, synthetic, literal, mutateWorkbook } from "./helpers";

const now = "2026-01-01T00:00:00.000Z";
const map = (bytes: Uint8Array, name = "Лист3") => mapSheet(readWorkbook(bytes, "fixture.xlsx").readSheet(name), "test-version", "fixture.xlsx", now);
describe("TC-01–17, 19, 21, 23: read-only ingestion and mapping", () => {
  it("matches the official 19-column source, 9 rows, 6 processes and 3 aggregates without any source write", () => {
    const before = official(); const book = readWorkbook(before, "Реестр МЛХ.xlsm");
    expect(book.checksum).toBe(OFFICIAL_CHECKSUM);
    expect(book.sheets.map(s => s.name)).toEqual(["Группы процессов!!!", "Глоссарий", "Наименование ОГВ", "10_МЛХ", "Лист3", "Цифра", "Лист2", "Лист1"]);
    const sheet = book.readSheet("Лист3"); expect(sheet.dimension).toBe("A1:EA17");
    const mapped = mapSheet(sheet, "version-1", "Реестр МЛХ.xlsm", now);
    expect(mapped.rows.map(r => r.excelRowNumber)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(mapped.rows.every(r => r.cells.length === 19)).toBe(true);
    expect(mapped.rows.filter(r => r.rowType === "PROCESS").map(r => r.excelRowNumber)).toEqual([9, 10, 11, 12, 14, 17]);
    expect(mapped.rows.filter(r => r.rowType === "AGGREGATE").map(r => r.excelRowNumber)).toEqual([13, 15, 16]);
    expect(mapped.processes).toHaveLength(6);
    expect(mapped.processes.every(p => p.analysisUnit.unitType === "PRIMARY" && p.analysisUnit.scoringEligible)).toBe(true);
    expect(new Set(mapped.processes.map(p => p.processId)).size).toBe(6);
    expect(mapped.processes.every(p => p.processId !== p.facts.find(f => f.field === "official_process_code")?.value)).toBe(true);
    expect(mapped.rows[0].cells.find(c => c.canonicalField === "hours_per_instance")?.normalizedValue).toBe(4);
    expect(mapped.rows[0].cells.find(c => c.canonicalField === "annual_instances")?.normalizedValue).toBe(12);
    const formulas = mapped.rows.flatMap(r => r.cells).filter(c => c.formula);
    expect(formulas.map(c => [c.coordinate, c.cachedValue])).toEqual([["K13", 35], ["L13", 2880], ["K14", 17.5], ["L14", 1440], ["K15", 10.5], ["L15", 864], ["K16", 3.5], ["L16", 288]]);
    expect(formulas.every(c => c.formula?.startsWith("="))).toBe(true);
    expect(mapped.issues.filter(i => i.code === "FORMULA_REFERENCE_OUTSIDE_TABLE")).toHaveLength(8);
    expect(mapped.rows[0].cells.find(c => c.columnLetter === "N")?.officialHeader).toContain("\n");
    const fact = mapped.processes[0].facts.find(f => f.field === "annual_instances")!;
    expect(mapped.sources.find(s => s.sourceReferenceId === fact.sourceReferenceIds[0])).toMatchObject({ coordinate: "L9", row: 9, sheet: "Лист3", factStatus: "Confirmed", sourceType: "registry", mappingVersion: "1.0.0" });
    expect(official()).toEqual(before); expect(sha256(official())).toBe(OFFICIAL_CHECKSUM);
  });
  it("rejects incompatible or missing sheets without fallback", () => {
    const book = readWorkbook(official(), "Реестр МЛХ.xlsm");
    expect(() => book.readSheet("missing")).toThrow(expect.objectContaining({ code: "MAPPING_SHEET_NOT_FOUND" }));
    expect(() => mapSheet(book.readSheet("Цифра"), "v", "file.xlsm", now)).toThrow(expect.objectContaining({ code: "MAPPING_HEADER_NOT_FOUND" }));
    expect(() => mapSheet(book.readSheet("10_МЛХ"), "v", "file.xlsm", now)).not.toThrow();
  });
  it("maps by header after column reorder and finds an explicit alternate sheet", () => {
    const headers = columns.map(c => c.header); [headers[10], headers[11]] = [headers[11], headers[10]];
    const result = map(synthetic({ name: "Другой", headerRow: 3, headers, rows: { 4: literal("D4", "Тест") + literal("K4", 12) + literal("L4", 4) } }), "Другой");
    expect(result.processes[0].facts.find(f => f.field === "annual_instances")?.value).toBe(12);
    expect(result.processes[0].facts.find(f => f.field === "hours_per_instance")?.value).toBe(4);
    expect(result.rows[0].excelRowNumber).toBe(4);
  });
  it.each([
    ["1/24", null, "INVALID_NUMBER"], ["1/1.5", null, "INVALID_NUMBER"], ["по необходимости", null, "INVALID_NUMBER"],
    ["1,5", 1.5, null], [-2, null, "NEGATIVE_NUMBER"], [0, 0, null],
  ])("preserves raw numeric input %s and normalizes conservatively", (raw, normalized, code) => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Тест") + literal("K9", raw) + literal("L9", 12) } }));
    const cell = result.rows[0].cells.find(c => c.columnLetter === "K")!;
    expect(cell.normalizedValue).toBe(normalized);
    if (code) expect(result.issues.some(i => i.code === code && i.coordinate === "K9")).toBe(true);
  });
  it.each([
    ['<c r="K9"><f>2+2</f></c>', "FORMULA_CACHE_MISSING"],
    ['<c r="K9" t="e"><f>2+2</f><v>#VALUE!</v></c>', "FORMULA_CACHE_ERROR"],
    ['<c r="K9" t="str"><f>2+2</f><v>1/24</v></c>', "FORMULA_CACHE_UNINTERPRETABLE"],
  ])("uses no calculation fallback for invalid cached result", (cellXml, code) => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Тест") + cellXml + literal("L9", 12) } }));
    expect(result.rows[0].cells.find(c => c.coordinate === "K9")).toMatchObject({ formula: "=2+2", normalizedValue: null });
    expect(result.issues.some(i => i.code === code)).toBe(true);
    expect(result.processes[0].facts.some(f => f.field === "hours_per_instance")).toBe(false);
  });
  it("uses a cached value even if it differs from the unevaluated formula", () => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Тест") + '<c r="K9"><f>2+2</f><v>999</v></c>' + literal("L9", 12) } }));
    expect(result.rows[0].cells.find(c => c.coordinate === "K9")).toMatchObject({ rawValue: "999", cachedValue: 999, normalizedValue: 999, formula: "=2+2" });
    expect(result.sources.find(s => s.coordinate === "K9")?.valueOrigin).toBe("formula_cached_value");
  });
  it("classifies empty, total, group and unknown before creating scoring entities", () => {
    const result = map(synthetic({ rows: { 9: "", 10: literal("A10", "Группа"), 11: literal("D11", "Итого"), 12: literal("K12", 3), 13: literal("D13", "Процесс") } }));
    expect(result.rows.map(r => r.rowType)).toEqual(["EMPTY", "GROUP_HEADER", "TOTAL", "UNKNOWN", "PROCESS"]);
    expect(result.processes).toHaveLength(1);
    expect(result.issues.some(i => i.code === "UNKNOWN_ROW_TYPE")).toBe(true);
  });
  it("rejects duplicated, missing and ambiguous headers", () => {
    expect(() => map(synthetic({ headers: [...columns.map(c => c.header), columns[0].header] }))).toThrow(expect.objectContaining({ code: "MAPPING_HEADER_DUPLICATE" }));
    expect(() => map(synthetic({ headers: columns.slice(0, 18).map(c => c.header) }))).toThrow(expect.objectContaining({ code: "MAPPING_REQUIRED_COLUMN_MISSING" }));
    const extraHeaders = columns.map((c, i) => literal(`${String.fromCharCode(65 + i)}9`, c.header)).join("");
    expect(() => map(synthetic({ name: "Дубль", rows: { 9: extraHeaders } }), "Дубль")).toThrow(expect.objectContaining({ code: "MAPPING_HEADER_AMBIGUOUS" }));
  });
  it("does not extend table boundaries to styled or unmapped cells", () => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Тест") + literal("T9", "extra"), 300: '<c r="A300" s="1"/>' } }));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cells.find(c => c.coordinate === "T9")?.rawValue).toBe("extra");
    expect(result.issues.some(i => i.code === "UNMAPPED_COLUMN_WITH_DATA")).toBe(true);
  });
  it("handles unknown enums, zero and literal errors with DQ", () => {
    const result = map(synthetic({ rows: { 9: literal("D9", "Тест") + literal("L9", 0) + literal("P9", "смешанный") + '<c r="K9" t="e"><v>#VALUE!</v></c>' } }));
    expect(result.issues.map(i => i.code)).toEqual(expect.arrayContaining(["ZERO_OR_INACTIVE_PROCESS", "UNMAPPED_ENUM_VALUE", "EXCEL_ERROR_VALUE"]));
  });
  it("rejects corrupt ZIP, unsupported type, extension mismatch and DTD", () => {
    expect(() => readWorkbook(new Uint8Array([1, 2]), "bad.xlsx")).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
    expect(() => readWorkbook(official(), "bad.csv")).toThrow(expect.objectContaining({ code: "UNSUPPORTED_FILE" }));
    expect(() => readWorkbook(official(), "bad.xlsx")).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
    const bytes = mutateWorkbook(synthetic(), "xl/workbook.xml", xml => '<!DOCTYPE workbook [<!ENTITY attack "text">]>' + xml);
    expect(() => readWorkbook(bytes, "bad.xlsx")).toThrow(expect.objectContaining({ code: "INVALID_WORKBOOK" }));
  });
  it("separates source row IDs from fingerprint and warns about duplicates without merging", () => {
    expect(sourceRowId("v1", "Лист3", 9)).toBe(sourceRowId("v1", "Лист3", 9));
    expect(sourceRowId("v1", "Лист3", 9)).not.toBe(sourceRowId("v2", "Лист3", 9));
    expect(fingerprint({ ministry: "МЛХ", process_name: "Процесс", row: 9, annual_instances: 12 })).toBe(fingerprint({ ministry: "млх", process_name: "Процесс", row: 17, annual_instances: 999 }));
    const result = map(synthetic({ rows: { 9: literal("D9", "Дубль") + literal("B9", "ОП."), 10: literal("D10", "Дубль") + literal("B10", "ОП.") } }));
    expect(result.processes).toHaveLength(2); expect(new Set(result.processes.map(p => p.processId)).size).toBe(2);
    expect(result.issues.map(i => i.code)).toEqual(expect.arrayContaining(["SOURCE_FINGERPRINT_COLLISION", "OFFICIAL_PROCESS_CODE_NOT_UNIQUE", "POSSIBLE_DUPLICATE_PROCESS"]));
  });
});
