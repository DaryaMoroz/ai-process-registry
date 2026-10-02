import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import path from "node:path";
import { ApplicationError } from "../errors";
import { sha256 } from "../identity";
import type { Value } from "@/shared/contracts";
import { inFormulaRange, translateFormula } from "./formulas";
import { REGISTRY_LIMITS, resourceLimit, type RegistryLimits } from "./limits";

type Xml = Record<string, unknown>;
const obj = (value: unknown): Xml => typeof value === "object" && value !== null ? value as Xml : {};
const list = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value];
const txt = (value: unknown): string => typeof value === "string" ? value : String(obj(value)["#text"] ?? "");
const richText = (value: unknown): string => {
  const item = obj(value);
  return item.t != null ? txt(item.t) : list(item.r).map(r => txt(obj(r).t)).join("");
};
export type CellType = "BLANK" | "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "ERROR" | "FORMULA" | "UNSUPPORTED";
export type ParsedCell = {
  coordinate: string;
  columnLetter: string;
  rowNumber: number;
  rawValue: Value;
  formula: string | null;
  cachedValue: Value;
  literalValue: Value;
  sourceCellType: string;
  cellType: CellType;
  cachedCellType: CellType | null;
  unsupportedFormula: boolean;
  formulaMetadata: {
    type: string; originalText: string; sharedIndex: string | null; declaredRef: string | null;
    masterCoordinate?: string; groupRef?: string; resolutionError?: string;
  } | null;
};
export type ParsedSheet = { name: string; sourceChecksum: string; dimension: string; rows: Record<number, ParsedCell[]> };
export type Workbook = {
  checksum: string;
  extension: "xlsx" | "xlsm";
  sheets: { name: string; target: string }[];
  readSheet: (name: string) => ParsedSheet;
};
export function emptyCell(columnLetter: string, rowNumber: number): ParsedCell {
  return { coordinate: `${columnLetter}${rowNumber}`, columnLetter, rowNumber, rawValue: null, formula: null,
    cachedValue: null, literalValue: null, sourceCellType: "", cellType: "BLANK", cachedCellType: null, unsupportedFormula: false, formulaMetadata: null };
}
export const hasContent = (cell: ParsedCell) => cell.formula !== null || cell.rawValue !== null && String(cell.rawValue).trim() !== "";

function resolveSharedFormulas(cells: ParsedCell[]): void {
  const mastersByGroup = new Map<string, ParsedCell[]>();
  for (const cell of cells) {
    const metadata = cell.formulaMetadata;
    if (metadata?.type !== "shared" || metadata.sharedIndex === null || !metadata.originalText) continue;
    const masters = mastersByGroup.get(metadata.sharedIndex) ?? [];
    masters.push(cell); mastersByGroup.set(metadata.sharedIndex, masters);
  }
  for (const cell of cells) {
    const metadata = cell.formulaMetadata;
    if (metadata?.type !== "shared") continue;
    const masters = mastersByGroup.get(metadata.sharedIndex ?? "") ?? [];
    const master = masters.length === 1 ? masters[0] : undefined;
    const ref = master?.formulaMetadata?.declaredRef;
    if (!master || !ref || !inFormulaRange(master.coordinate, ref) || !inFormulaRange(cell.coordinate, ref)) {
      cell.unsupportedFormula = true;
      metadata.resolutionError = !master ? "SHARED_MASTER_MISSING_OR_AMBIGUOUS" : "SHARED_REF_INVALID_OR_OUTSIDE";
      continue;
    }
    metadata.masterCoordinate = master.coordinate; metadata.groupRef = ref;
    cell.formula = `=${translateFormula(master.formulaMetadata!.originalText, master.coordinate, cell.coordinate)}`;
    cell.unsupportedFormula = false;
  }
}

// OOXML is read as a ZIP in memory. No workbook save API, macro runtime or calculation engine.
export function readWorkbook(bytes: Uint8Array, fileName: string, limits: RegistryLimits = REGISTRY_LIMITS): Workbook {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  if (extension !== "xlsx" && extension !== "xlsm") throw new ApplicationError("UNSUPPORTED_FILE", "Поддерживаются файлы .xlsx и .xlsm.");
  try {
    let totalSize = 0;
    let entries = 0;
    const files = unzipSync(bytes, { filter(entry) {
      totalSize += entry.originalSize;
      entries += 1;
      if (totalSize > limits.maxExpandedBytes) resourceLimit("maxExpandedBytes", totalSize, limits.maxExpandedBytes);
      if (entries > limits.maxZipEntries) resourceLimit("maxZipEntries", entries, limits.maxZipEntries);
      return entry.name.endsWith(".xml") || entry.name.endsWith(".rels");
    } });
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false, trimValues: false });
    const xml = (name: string): Xml => {
      if (!files[name]) throw new Error(`Missing OOXML entry: ${name}`);
      const input = strFromU8(files[name]);
      if (/<!DOCTYPE|<!ENTITY/i.test(input) || XMLValidator.validate(input) !== true) throw new Error("Invalid XML");
      return obj(parser.parse(input));
    };
    const types = list(obj(xml("[Content_Types].xml").Types).Override);
    const workbookType = types.map(obj).find(v => v["@_PartName"] === "/xl/workbook.xml")?.["@_ContentType"];
    const expectedType = extension === "xlsm" ? "application/vnd.ms-excel.sheet.macroEnabled.main+xml" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
    if (workbookType !== expectedType) throw new Error("Extension does not match OOXML content type");
    const book = obj(xml("xl/workbook.xml").workbook);
    const relations = list(obj(xml("xl/_rels/workbook.xml.rels").Relationships).Relationship).map(obj);
    const sheets = list(obj(book.sheets).sheet).map(value => {
      const sheet = obj(value);
      const relation = relations.find(r => r["@_Id"] === sheet["@_r:id"]);
      if (!relation || relation["@_TargetMode"] === "External") throw new Error("Invalid sheet relationship");
      const target = String(relation["@_Target"]);
      const resolved = target.startsWith("/") ? target.slice(1) : path.posix.normalize(`xl/${target}`);
      if (!resolved.startsWith("xl/") || !files[resolved]) throw new Error("Invalid sheet path");
      return { name: String(sheet["@_name"]), target: resolved };
    });
    if (!sheets.length || new Set(sheets.map(s => s.name)).size !== sheets.length) throw new Error("Invalid sheets");
    const strings = files["xl/sharedStrings.xml"] ? list(obj(xml("xl/sharedStrings.xml").sst).si).map(richText) : [];
    const styles = files["xl/styles.xml"] ? obj(xml("xl/styles.xml").styleSheet) : {};
    const formats = new Map(list(obj(styles.numFmts).numFmt).map(value => {
      const item = obj(value); return [Number(item["@_numFmtId"]), String(item["@_formatCode"])];
    }));
    const dateStyles = list(obj(styles.cellXfs).xf).map(value => {
      const id = Number(obj(value)["@_numFmtId"]);
      return (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[ymdhis]/i.test((formats.get(id) ?? "").replace(/"[^"]*"|\\.|\[[^\]]*\]/g, ""));
    });
    const checksum = sha256(bytes);
    return {
      checksum, extension, sheets,
      readSheet(name) {
        try {
        const sheet = sheets.find(s => s.name === name);
        if (!sheet) throw new ApplicationError("MAPPING_SHEET_NOT_FOUND", "Выбранный лист отсутствует в книге.");
        const worksheet = obj(xml(sheet.target).worksheet);
        if (!Object.hasOwn(worksheet, "sheetData")) throw new Error("Missing sheetData");
        const rowNodes = list(obj(worksheet.sheetData).row);
        if (rowNodes.length > limits.maxWorksheetRows) resourceLimit("maxWorksheetRows", rowNodes.length, limits.maxWorksheetRows);
        const cellCount = rowNodes.reduce<number>((total, row) => total + list(obj(row).c).length, 0);
        if (cellCount > limits.maxWorksheetCells) resourceLimit("maxWorksheetCells", cellCount, limits.maxWorksheetCells);
        const rows: ParsedSheet["rows"] = {};
        for (const rowNode of rowNodes) {
          const row = obj(rowNode);
          const rowNumber = Number(row["@_r"]);
          if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 1048576 || rows[rowNumber]) throw new Error("Invalid row");
          rows[rowNumber] = list(row.c).map(value => {
            const c = obj(value);
            const coordinate = String(c["@_r"]);
            const match = /^([A-Z]{1,3})([1-9]\d*)$/.exec(coordinate);
            if (!match || Number(match[2]) !== rowNumber) throw new Error("Invalid cell coordinate");
            const sourceCellType = String(c["@_t"] ?? "");
            const payload = c.v == null || txt(c.v) === "" ? null : txt(c.v);
            let rawValue: Value = payload;
            let decoded: Value = payload;
            let type: CellType = payload === null ? "BLANK" : "STRING";
            if (sourceCellType === "s") {
              if (payload === null || !/^\d+$/.test(payload) || strings[Number(payload)] === undefined) throw new Error("Invalid shared string");
              rawValue = decoded = strings[Number(payload)]; type = "STRING";
            } else if (sourceCellType === "inlineStr") {
              rawValue = decoded = richText(c.is); type = "STRING";
            } else if (sourceCellType === "e") type = "ERROR";
            else if (sourceCellType === "d") type = "DATE";
            else if (sourceCellType === "b") { type = "BOOLEAN"; decoded = payload === "1" ? true : payload === "0" ? false : null; }
            else if (sourceCellType === "n" || sourceCellType === "") {
              type = payload === null ? "BLANK" : dateStyles[Number(c["@_s"] ?? 0)] ? "DATE" : "NUMBER";
              decoded = payload !== null && Number.isFinite(Number(payload)) ? Number(payload) : null;
            } else if (sourceCellType !== "str") type = "UNSUPPORTED";
            const isFormula = Object.hasOwn(c, "f");
            const formulaText = isFormula ? txt(c.f) : "";
            const unsupportedFormula = isFormula && !formulaText;
            const formulaNode = obj(c.f);
            return { coordinate, columnLetter: match[1], rowNumber, rawValue,
              formula: isFormula ? `=${formulaText}` : null,
              cachedValue: isFormula ? decoded : null, literalValue: isFormula ? null : decoded,
              sourceCellType, cellType: isFormula ? "FORMULA" : type, cachedCellType: isFormula ? type : null, unsupportedFormula,
              formulaMetadata: isFormula ? { type: String(formulaNode["@_t"] ?? "normal"), originalText: formulaText,
                sharedIndex: formulaNode["@_si"] == null ? null : String(formulaNode["@_si"]),
                declaredRef: formulaNode["@_ref"] == null ? null : String(formulaNode["@_ref"]) } : null };
          });
          if (new Set(rows[rowNumber].map(c => c.coordinate)).size !== rows[rowNumber].length) throw new Error("Duplicate cell");
        }
        resolveSharedFormulas(Object.values(rows).flat());
        return { name, sourceChecksum: checksum, dimension: String(obj(worksheet.dimension)["@_ref"] ?? ""), rows };
        } catch (error) {
          if (error instanceof ApplicationError) throw error;
          throw new ApplicationError("INVALID_WORKSHEET", "Не удалось прочитать структуру выбранного листа.");
        }
      },
    };
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("INVALID_WORKBOOK", "Не удалось прочитать книгу. Проверьте формат и целостность файла.");
  }
}
