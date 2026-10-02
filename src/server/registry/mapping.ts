import { randomUUID } from "node:crypto";
import { columns, PROFILE, explicitRowType, type Column } from "./profile";
import { emptyCell, hasContent, type ParsedCell, type ParsedSheet } from "./parser";
import { fingerprint, sourceRowId, textValue, token } from "../identity";
import type { AnalysisUnit, DQIssue, Fact, ProcessRecord, RowType, SourceCell, SourceReference, SourceRow } from "../domain";
import type { Value } from "@/shared/contracts";
import { ApplicationError } from "../errors";
import { formulaFacts, rangeIncludesOtherRows } from "./formulas";
import { REGISTRY_LIMITS, resourceLimit, type RegistryLimits } from "./limits";
import { ownValue } from "../lookup";

type Normalization = { value: Value; code?: string };
export function normalize(cell: ParsedCell, column: Column): Normalization {
  const formula = cell.formula !== null;
  const value = formula ? cell.cachedValue : cell.literalValue;
  const type = formula ? cell.cachedCellType : cell.cellType;
  if (type === "ERROR") return { value: null, code: formula ? "FORMULA_CACHE_ERROR" : "EXCEL_ERROR_VALUE" };
  if (formula && (cell.rawValue === null || type === "BLANK")) return { value: null, code: "FORMULA_CACHE_MISSING" };
  if (type === "UNSUPPORTED" || type === "DATE" || type === "BOOLEAN") return { value: null, code: formula ? "FORMULA_CACHE_UNINTERPRETABLE" : "UNSUPPORTED_CELL_TYPE" };
  if (value === null || typeof value === "string" && value.trim() === "") {
    return { value: null, code: formula ? "FORMULA_CACHE_UNINTERPRETABLE" : column.required ? "MISSING_REQUIRED_VALUE" : undefined };
  }
  if (column.numeric) {
    const numeric = typeof value === "number" ? value : typeof value === "string" && /^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
    if (!Number.isFinite(numeric)) return { value: null, code: formula ? "FORMULA_CACHE_UNINTERPRETABLE" : "INVALID_NUMBER" };
    if (numeric < 0) return { value: null, code: "NEGATIVE_NUMBER" };
    return { value: numeric, code: column.field === "annual_instances" && numeric === 0 ? "ZERO_OR_INACTIVE_PROCESS" : undefined };
  }
  if (typeof value !== "string") return { value: null, code: formula ? "FORMULA_CACHE_UNINTERPRETABLE" : "UNSUPPORTED_CELL_TYPE" };
  if (column.enums) {
    const mapped = ownValue(column.enums, token(value));
    return mapped === undefined ? { value: null, code: "UNMAPPED_ENUM_VALUE" } : { value: mapped };
  }
  return { value: textValue(value) };
}

const warnings = new Set(["UNMAPPED_ENUM_VALUE", "ZERO_OR_INACTIVE_PROCESS", "FORMULA_REFERENCE_OUTSIDE_TABLE", "CONDITIONAL_VALUE_MISSING", "UNKNOWN_ROW_TYPE", "POSSIBLE_DUPLICATE_PROCESS", "SOURCE_FINGERPRINT_COLLISION", "UNMAPPED_COLUMN_WITH_DATA"]);
const infos = new Set(["AGGREGATE_METRIC_FORMULA", "UNEXPECTED_CROSS_PROCESS_DETAIL", "OFFICIAL_PROCESS_CODE_NOT_UNIQUE"]);
const messages: Record<string, string> = {
  MISSING_REQUIRED_VALUE: "Обязательное поле не заполнено.", INVALID_NUMBER: "Значение нельзя однозначно прочитать как число.",
  NEGATIVE_NUMBER: "Отрицательное значение недопустимо.", ZERO_OR_INACTIVE_PROCESS: "Частота равна нулю: V1 требует уточнения.",
  UNMAPPED_ENUM_VALUE: "Значение отсутствует в mapping-профиле.", UNSUPPORTED_CELL_TYPE: "Тип ячейки не соответствует полю.",
  EXCEL_ERROR_VALUE: "Ячейка содержит ошибку Excel.", FORMULA_CACHE_MISSING: "У формулы отсутствует сохранённый результат.",
  FORMULA_CACHE_ERROR: "Сохранённый результат формулы содержит ошибку Excel.", FORMULA_CACHE_UNINTERPRETABLE: "Сохранённый результат формулы неоднозначен.",
  FORMULA_REFERENCE_OUTSIDE_TABLE: "Формула ссылается за пределы таблицы; пересчёт не выполняется.",
  AGGREGATE_METRIC_FORMULA: "Строка агрегирует другие строки и исключена из scoring.",
  CONDITIONAL_VALUE_MISSING: "Для сквозного процесса не указаны участники.",
  UNEXPECTED_CROSS_PROCESS_DETAIL: "У несквозного процесса заполнены сведения о сквозном потоке.",
  OFFICIAL_PROCESS_CODE_NOT_UNIQUE: "Официальный код повторяется; процессы сохраняются отдельно.",
  UNKNOWN_ROW_TYPE: "Тип строки требует проверки. Scoring недоступен.", PROCESS_NAME_MISSING: "Отсутствует название самостоятельного процесса.",
  POSSIBLE_DUPLICATE_PROCESS: "Обнаружены процессы с одинаковым нормализованным названием; объединение не выполняется.",
  SOURCE_FINGERPRINT_COLLISION: "Fingerprint повторяется; идентичности сохраняются раздельно.",
  UNMAPPED_COLUMN_WITH_DATA: "За пределами mapping есть данные. Они сохранены и не участвуют в scoring.",
};
function issue(versionId: string, sheet: string, code: string, cell?: SourceCell, row?: number): DQIssue {
  return { id: randomUUID(), code, severity: infos.has(code) ? "INFO" : warnings.has(code) ? "WARNING" : "ERROR",
    message: messages[code] ?? code, field: cell?.canonicalField ?? null,
    affectsScoring: !infos.has(code) && !["FORMULA_REFERENCE_OUTSIDE_TABLE", "UNMAPPED_COLUMN_WITH_DATA"].includes(code),
    sourceReferenceIds: cell ? [cell.sourceCellId] : [], registryVersionId: versionId, sheet,
    row: cell?.rowNumber ?? row ?? null, coordinate: cell?.coordinate ?? null, rawEvidence: cell?.rawValue ?? null,
    mappingVersion: PROFILE.version, status: "OPEN" };
}

function headers(sheet: ParsedSheet): { headerRow: number; mappings: Map<string, Column>; officialHeaders: Map<string, string> } {
  const expected = new Map(columns.map(c => [textValue(c.header), c]));
  const candidates = sheet.name === PROFILE.defaultSheet ? [8] : Object.keys(sheet.rows).map(Number).sort((a, b) => a - b)
    .filter(row => sheet.rows[row].some(hasContent)).slice(0, 50);
  const matches = candidates.filter(row => {
    const values = new Set((sheet.rows[row] ?? []).map(c => typeof c.literalValue === "string" ? textValue(c.literalValue) : ""));
    return [...expected.keys()].every(h => values.has(h));
  });
  if (matches.length > 1) throw new ApplicationError("MAPPING_HEADER_AMBIGUOUS", "Найдено несколько строк с полной сигнатурой заголовков.");
  if (!matches.length) {
    const pilotHasHeaders = sheet.name === PROFILE.defaultSheet && (sheet.rows[8] ?? []).some(c => typeof c.literalValue === "string" && expected.has(textValue(c.literalValue)));
    throw new ApplicationError(pilotHasHeaders ? "MAPPING_REQUIRED_COLUMN_MISSING" : "MAPPING_HEADER_NOT_FOUND", "Не найдена полная сигнатура из 19 заголовков профиля МЛХ.");
  }
  const mappings = new Map<string, Column>();
  const officialHeaders = new Map<string, string>();
  const seen = new Set<string>();
  for (const cell of sheet.rows[matches[0]]) {
    if (typeof cell.literalValue !== "string") continue;
    const column = expected.get(textValue(cell.literalValue));
    if (!column) continue;
    if (seen.has(column.field)) throw new ApplicationError("MAPPING_HEADER_DUPLICATE", "Официальный заголовок встречается более одного раза.");
    seen.add(column.field); mappings.set(cell.columnLetter, column); officialHeaders.set(cell.columnLetter, cell.literalValue);
  }
  return { headerRow: matches[0], mappings, officialHeaders };
}

function aggregating(cell: SourceCell): boolean {
  if (!cell.formula) return false;
  const facts = formulaFacts(cell.formula);
  return facts.aggregations.some(operation => {
    const otherRows = new Set(operation.references.filter(r => r.column === cell.columnLetter && r.row !== null && r.row !== cell.rowNumber).map(r => r.row));
    return otherRows.size >= 2 || operation.operation === "SUM"
      && operation.ranges.some(range => rangeIncludesOtherRows(range, cell.columnLetter, cell.rowNumber));
  });
}
export function classify(cells: SourceCell[]): { type: RowType; evidence: string[] } {
  const at = (field: string) => cells.find(c => c.canonicalField === field)!;
  if (!cells.some(hasContent)) return { type: "EMPTY", evidence: [] };
  const identifiers = columns.slice(0, 4).map(c => at(c.field));
  const exactTotal = identifiers.some(c => ["итого", "общий итог", "всего", "total", "grand total"].includes(token(String(c.normalizedValue ?? ""))));
  const prefixedTotal = identifiers.some(c => /^(итого|всего) /.test(token(String(c.normalizedValue ?? ""))));
  const metrics = [at("hours_per_instance"), at("annual_instances")];
  if (exactTotal || prefixedTotal && metrics.some(c => typeof c.normalizedValue === "number" || aggregating(c))) return { type: "TOTAL", evidence: identifiers.filter(hasContent).map(c => c.coordinate) };
  if (metrics.some(aggregating)) return { type: "AGGREGATE", evidence: metrics.filter(aggregating).map(c => c.coordinate) };
  if (metrics.some(c => c.unsupportedFormula)) return { type: "UNKNOWN", evidence: metrics.filter(c => c.unsupportedFormula).map(c => c.coordinate) };
  if (!at("process_name").normalizedValue && identifiers.slice(0, 3).some(hasContent) && !columns.slice(10).some(c => hasContent(at(c.field)))) return { type: "GROUP_HEADER", evidence: identifiers.filter(hasContent).map(c => c.coordinate) };
  if (at("process_name").normalizedValue) return { type: "PROCESS", evidence: [at("process_name").coordinate] };
  return { type: "UNKNOWN", evidence: cells.filter(hasContent).map(c => c.coordinate) };
}

export function mapSheet(sheet: ParsedSheet, versionId: string, fileName: string, now: string, limits: RegistryLimits = REGISTRY_LIMITS): { rows: SourceRow[]; processes: ProcessRecord[]; issues: DQIssue[]; sources: SourceReference[] } {
  const { headerRow, mappings, officialHeaders } = headers(sheet);
  const lastRow = Object.entries(sheet.rows).reduce((last, [row, cells]) => Number(row) > headerRow && cells.some(c => mappings.has(c.columnLetter) && hasContent(c)) ? Math.max(last, Number(row)) : last, headerRow);
  // Bound the analytical expansion before allocating any SourceRow/SourceReference, even for tiny sparse ZIPs.
  if (lastRow - headerRow > limits.maxTableRowSpan) resourceLimit("maxTableRowSpan", lastRow - headerRow, limits.maxTableRowSpan);
  const rows: SourceRow[] = [], processes: ProcessRecord[] = [], issues: DQIssue[] = [], sources: SourceReference[] = [];
  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber++) {
    const id = sourceRowId(versionId, sheet.name, rowNumber);
    const parsed = sheet.rows[rowNumber] ?? [];
    const cells: SourceCell[] = [...mappings.entries()].map(([letter, column]) => {
      const cell = parsed.find(c => c.columnLetter === letter) ?? emptyCell(letter, rowNumber);
      const normalized = normalize(cell, column);
      return { ...cell, sourceCellId: `${id}:${letter}`, sourceRowId: id, officialHeader: officialHeaders.get(letter)!, canonicalField: column.field,
        normalizedValue: normalized.value, normalizationStatus: normalized.code ?? (normalized.value === null ? "MISSING" : "OK"), mappingVersion: PROFILE.version };
    });
    const genericClassification = classify(cells);
    const profileRowType = explicitRowType(sheet, rowNumber);
    const classification = profileRowType === undefined ? genericClassification : {
      type: profileRowType,
      evidence: [`${PROFILE.id}@${PROFILE.version}:${sheet.sourceChecksum}:${sheet.name}:${rowNumber}`, ...genericClassification.evidence],
    };
    const rowIssues: DQIssue[] = [];
    const add = (code: string, cell?: SourceCell) => rowIssues.push(issue(versionId, sheet.name, code, cell, rowNumber));
    for (const cell of cells) {
      if (cell.normalizationStatus !== "OK" && cell.normalizationStatus !== "MISSING" && (classification.type === "PROCESS" || cell.normalizationStatus !== "MISSING_REQUIRED_VALUE")) add(cell.normalizationStatus, cell);
      if (cell.formula) {
        const facts = formulaFacts(cell.formula);
        if (facts.external || facts.references.some(r => r.row === null || r.column === null || r.row <= headerRow || r.row > lastRow || !mappings.has(r.column))) add("FORMULA_REFERENCE_OUTSIDE_TABLE", cell);
      }
      sources.push({ sourceReferenceId: cell.sourceCellId, sourceType: "registry", factStatus: classification.type === "PROCESS" && cell.normalizedValue !== null ? "Confirmed" : "Unknown",
        sourceName: fileName, sheet: sheet.name, row: rowNumber, column: cell.columnLetter, coordinate: cell.coordinate,
        excerptOrValue: cell.rawValue, registryVersionId: versionId, sourceRowId: id, sourceCellId: cell.sourceCellId, mappingVersion: PROFILE.version,
        rawValue: cell.rawValue, formula: cell.formula, formulaMetadata: cell.formulaMetadata, cachedValue: cell.cachedValue, normalizedValue: cell.normalizedValue,
        valueOrigin: cell.formula ? "formula_cached_value" : "literal", verificationState: cell.normalizationStatus });
    }
    // Retain extra data without allowing it to extend the official table or enter scoring.
    for (const extra of parsed.filter(c => !mappings.has(c.columnLetter) && hasContent(c))) {
      const retained: SourceCell = { ...extra, sourceCellId: `${id}:${extra.columnLetter}`, sourceRowId: id, canonicalField: "unmapped", officialHeader: "", normalizedValue: null, normalizationStatus: "UNMAPPED", mappingVersion: PROFILE.version };
      cells.push(retained); add("UNMAPPED_COLUMN_WITH_DATA", retained);
      sources.push({ sourceReferenceId: retained.sourceCellId, sourceType: "registry", factStatus: null, sourceName: fileName, sheet: sheet.name, row: rowNumber, coordinate: extra.coordinate, excerptOrValue: extra.rawValue });
    }
    const get = (field: string) => cells.find(c => c.canonicalField === field)!;
    if (classification.type === "AGGREGATE") add("AGGREGATE_METRIC_FORMULA", cells.find(aggregating));
    if (classification.type === "UNKNOWN") { add("UNKNOWN_ROW_TYPE"); if (!get("process_name").normalizedValue) add("PROCESS_NAME_MISSING", get("process_name")); }
    if (classification.type === "PROCESS") {
      if (get("cross_process_flag").normalizedValue === "cross_functional" && !get("cross_process_parties").normalizedValue) add("CONDITIONAL_VALUE_MISSING", get("cross_process_parties"));
      if (get("cross_process_flag").normalizedValue === "non_cross_functional" && (get("cross_process_parties").normalizedValue || get("ministry_role_in_cross_process").normalizedValue)) add("UNEXPECTED_CROSS_PROCESS_DETAIL", get("cross_process_flag"));
    }
    const row: SourceRow = { sourceRowId: id, registryVersionId: versionId, sheetName: sheet.name, excelRowNumber: rowNumber,
      rowType: classification.type, scoringEligible: classification.type === "PROCESS", classificationRuleId: `MLH_${profileRowType === undefined ? "GENERIC" : "PROFILE"}_${classification.type}_v1.0.0`, classificationEvidence: classification.evidence,
      genericRowType: genericClassification.type, genericClassificationEvidence: genericClassification.evidence, classificationOrigin: profileRowType === undefined ? "GENERIC" : "PROFILE",
      mappingVersion: PROFILE.version, cells, fingerprint: classification.type === "PROCESS" ? fingerprint(Object.fromEntries(cells.map(c => [c.canonicalField, c.normalizedValue]))) : null,
      fingerprintVersion: PROFILE.fingerprintVersion };
    rows.push(row);
    if (classification.type === "PROCESS") {
      const processId = randomUUID(), analysisUnitId = randomUUID();
      const unit: AnalysisUnit = { analysisUnitId, processId, sourceRowId: id, unitType: "PRIMARY", parentAnalysisUnitId: null, name: String(get("process_name").normalizedValue), status: "ACTIVE", scoringEligible: true };
      const facts: Fact[] = cells.filter(c => c.normalizedValue !== null).map(c => ({ factId: randomUUID(), analysisUnitId, field: c.canonicalField, value: c.normalizedValue,
        unit: columns.find(col => col.field === c.canonicalField)?.unit ?? null, factStatus: "Confirmed", sourceType: "registry", sourceReferenceIds: [c.sourceCellId] }));
      processes.push({ processId, sourceRowId: id, registryVersionId: versionId, sheetName: sheet.name, cardVersion: 1, createdAt: now, analysisUnit: unit,
        facts, issues: rowIssues, sourceReferences: sources.filter(s => s.sourceRowId === id), attempts: [], inputSnapshots: [], scoreSnapshots: [], activeScoreSnapshotId: null });
    }
    issues.push(...rowIssues);
  }
  for (const row of rows.filter(r => r.rowType === "PROCESS")) {
    const get = (r: SourceRow, field: string) => r.cells.find(c => c.canonicalField === field)!;
    const peers = rows.filter(r => r !== row && r.rowType === "PROCESS");
    const checks: [string, string, boolean][] = [
      ["OFFICIAL_PROCESS_CODE_NOT_UNIQUE", "official_process_code", !!get(row, "official_process_code").normalizedValue && peers.some(r => get(r, "official_process_code").normalizedValue === get(row, "official_process_code").normalizedValue)],
      ["POSSIBLE_DUPLICATE_PROCESS", "process_name", peers.some(r => token(String(get(r, "process_name").normalizedValue)) === token(String(get(row, "process_name").normalizedValue)))],
      ["SOURCE_FINGERPRINT_COLLISION", "process_name", peers.some(r => r.fingerprint === row.fingerprint)],
    ];
    for (const [code, field, applies] of checks) if (applies) {
      const dq = issue(versionId, sheet.name, code, get(row, field));
      issues.push(dq); processes.find(p => p.sourceRowId === row.sourceRowId)!.issues.push(dq);
    }
  }
  return { rows, processes, issues, sources };
}
