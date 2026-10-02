// Translate OOXML A1 references only; never evaluate formula expressions or cached values.
const MAX_COLUMN = 16384;
const MAX_ROW = 1048576;
const columnNumber = (column: string) => [...column.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
function columnName(number: number): string {
  let result = "";
  while (number > 0) { number--; result = String.fromCharCode(65 + number % 26) + result; number = Math.floor(number / 26); }
  return result;
}
function address(value: string) {
  const match = /^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i.exec(value);
  if (!match) return null;
  const column = columnNumber(match[1]), row = Number(match[2]);
  return column <= MAX_COLUMN && row <= MAX_ROW ? { column, row } : null;
}
export function inFormulaRange(coordinate: string, ref: string): boolean {
  const parts = ref.split(":");
  if (parts.length > 2) return false;
  const cell = address(coordinate), start = address(parts[0]), end = address(parts[1] ?? parts[0]);
  return !!cell && !!start && !!end && cell.column >= start.column && cell.column <= end.column && cell.row >= start.row && cell.row <= end.row;
}

type FormulaToken = { kind: "opaque" | "qualifier" | "reference" | "identifier" | "symbol"; text: string };
// A lexical layer shared by reference translation and mapping; this is not a calculation engine.
export function formulaTokens(formula: string): FormulaToken[] {
  // Strings, sheet/workbook qualifiers and structured table references are opaque tokens.
  const identifier = /[\p{L}\p{N}_.\\]/u;
  const tokens: FormulaToken[] = [];
  let index = 0;
  while (index < formula.length) {
    const rest = formula.slice(index);
    const opaque = /^(?:"(?:[^"]|"")*"|'(?:[^']|'')*'(?:\s*!|)|(?:\[[^\]]+\])?[\p{L}\p{N}_.$\\]+(?::[\p{L}\p{N}_.$\\]+)?!)/u.exec(rest);
    if (opaque) { tokens.push({ kind: opaque[0].endsWith("!") ? "qualifier" : "opaque", text: opaque[0] }); index += opaque[0].length; continue; }
    if (rest[0] === "[") {
      let end = index + 1, depth = 1;
      while (end < formula.length && depth) {
        if (formula[end] === "'") { end += 2; continue; }
        if (formula[end] === "[") depth++;
        if (formula[end] === "]") depth--;
        end++;
      }
      tokens.push({ kind: "opaque", text: formula.slice(index, end) }); index = end; continue;
    }
    if (index === 0 || !identifier.test(formula[index - 1])) {
      const match = /^(\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\$?[1-9]\d*:\$?[1-9]\d*|\$?[A-Z]{1,3}\$?[1-9]\d*)/i.exec(rest);
      if (match && !identifier.test(rest[match[0].length] ?? "") && !/^\s*\(/.test(rest.slice(match[0].length))) {
        const value = match[0];
        if (value.includes(":")) {
          const parts = value.split(":");
          const isColumn = /[A-Z]/i.test(value);
          const valid = parts.every(p => isColumn ? columnNumber(p.replace("$", "")) <= MAX_COLUMN : Number(p.replace("$", "")) <= MAX_ROW);
          if (valid) { tokens.push({ kind: "reference", text: value }); index += value.length; continue; }
        } else if (address(value)) { tokens.push({ kind: "reference", text: value }); index += value.length; continue; }
      }
    }
    const name = /^[\p{L}_\\][\p{L}\p{N}_.\\]*/u.exec(rest);
    if (name) { tokens.push({ kind: "identifier", text: name[0] }); index += name[0].length; continue; }
    tokens.push({ kind: "symbol", text: formula[index++] });
  }
  return tokens;
}

export type FormulaRange = { firstColumn: number; lastColumn: number; firstRow: number; lastRow: number };
type FormulaReference = { column: string | null; row: number | null };
type FormulaDependencies = { references: FormulaReference[]; ranges: FormulaRange[] };
type FormulaAggregation = FormulaDependencies & { operation: "SUM" | "ADD" };
type DependencyToken = FormulaDependencies & { endIndex: number };

function referencesIn(value: string): FormulaReference[] {
  return value.split(":").map(part => {
    const cell = address(part);
    return { column: cell ? columnName(cell.column) : /[A-Z]/i.test(part) ? part.replace("$", "").toUpperCase() : null,
      row: cell?.row ?? (/^\$?\d+$/.test(part) ? Number(part.replace("$", "")) : null) };
  });
}

// Bind dependencies to operation/argument scopes, without evaluating Excel functions.
// Other function calls consume their arguments; their scalar result is not the input range.
function aggregationFacts(tokens: FormulaToken[], dependencies: Map<number, DependencyToken>): FormulaAggregation[] {
  type Scope = { functionName: string | null; current: FormulaDependencies; completed: FormulaDependencies; addition: boolean };
  const empty = (): FormulaDependencies => ({ references: [], ranges: [] });
  const scope = (functionName: string | null): Scope => ({ functionName, current: empty(), completed: empty(), addition: false });
  const append = (target: FormulaDependencies, source: FormulaDependencies) => {
    for (const reference of source.references) target.references.push(reference);
    for (const range of source.ranges) target.ranges.push(range);
  };
  const aggregations: FormulaAggregation[] = [];
  const finishArgument = (active: Scope) => {
    if (active.addition && (active.current.references.length || active.current.ranges.length)) {
      aggregations.push({ operation: "ADD", ...active.current });
    }
    append(active.completed, active.current);
    active.current = empty(); active.addition = false;
  };
  const scopes = [scope(null)];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i], active = scopes[scopes.length - 1];
    const dependency = dependencies.get(i);
    if (dependency) { append(active.current, dependency); i = dependency.endIndex; continue; }
    if (token.kind !== "symbol") continue;
    if (token.text === "(") {
      const previous = tokens[i - 1];
      scopes.push(scope(previous?.kind === "identifier" ? previous.text.replace(/^_xlfn\./i, "").toUpperCase() : null));
    } else if (token.text === "+") {
      active.addition = true;
    } else if (token.text === "," || token.text === ";") {
      finishArgument(active);
    } else if (token.text === ")" && scopes.length > 1) {
      finishArgument(active); scopes.pop();
      if (active.functionName === "SUM" && (active.completed.references.length || active.completed.ranges.length)) {
        aggregations.push({ operation: "SUM", ...active.completed });
      }
      // Parentheses and SUM preserve contributing dependencies. A lookup/other function does not.
      if (active.functionName === null || active.functionName === "SUM") append(scopes[scopes.length - 1].current, active.completed);
    }
  }
  finishArgument(scopes[0]);
  return aggregations;
}

function rectangle(first: { column: number; row: number }, last: { column: number; row: number }): FormulaRange {
  return { firstColumn: Math.min(first.column, last.column), lastColumn: Math.max(first.column, last.column),
    firstRow: Math.min(first.row, last.row), lastRow: Math.max(first.row, last.row) };
}
export function rangeIncludesOtherRows(range: FormulaRange, column: string, row: number): boolean {
  const number = columnNumber(column);
  return range.firstColumn <= number && number <= range.lastColumn && (range.firstRow !== row || range.lastRow !== row);
}

export function formulaFacts(formula: string) {
  const tokens = formulaTokens(formula);
  const references = tokens.filter(t => t.kind === "reference").flatMap(t => referencesIn(t.text));
  const significant = tokens.filter(t => t.text.trim());
  // Keep rectangular bounds only: even whole-sheet references must never expand into cells.
  const ranges: FormulaRange[] = [];
  const dependencies = new Map<number, DependencyToken>();
  for (let i = 0; i < significant.length; i++) {
    const token = significant[i];
    if (token.kind !== "reference") continue;
    const dependency: DependencyToken = { references: referencesIn(token.text), ranges: [], endIndex: i };
    if (token.text.includes(":")) {
      const [first, last] = token.text.split(":").map(value => value.replace("$", ""));
      const columns = /[A-Z]/i.test(first);
      dependency.ranges.push(rectangle(
        { column: columns ? columnNumber(first) : 1, row: columns ? 1 : Number(first) },
        { column: columns ? columnNumber(last) : MAX_COLUMN, row: columns ? MAX_ROW : Number(last) },
      ));
    } else if (significant[i + 1]?.kind === "symbol" && significant[i + 1].text === ":") {
      const endpoint = significant[i + 2]?.kind === "qualifier" ? significant[i + 3] : significant[i + 2];
      const first = address(token.text), last = endpoint?.kind === "reference" ? address(endpoint.text) : null;
      if (first && last) {
        dependency.ranges.push(rectangle(first, last));
        dependency.references.push(...referencesIn(endpoint.text));
        dependency.endIndex = significant[i + 2]?.kind === "qualifier" ? i + 3 : i + 2;
      }
    }
    // Range endpoints describe bounds, not two scalar operands of addition.
    if (dependency.ranges.length) dependency.references = [];
    ranges.push(...dependency.ranges);
    dependencies.set(i, dependency);
  }
  return { references, ranges, aggregations: aggregationFacts(significant, dependencies), external: tokens.some(t => t.kind === "qualifier"),
    addition: tokens.some(t => t.kind === "symbol" && t.text === "+"),
    sum: significant.some((t, i) => t.kind === "identifier" && /^(?:_xlfn\.)?SUM$/i.test(t.text) && significant[i + 1]?.text === "("),
    range: tokens.some(t => t.kind === "symbol" && t.text === ":" || t.kind === "reference" && t.text.includes(":")) };
}

export function translateFormula(formula: string, master: string, target: string): string {
  const from = address(master), to = address(target);
  if (!from || !to) throw new Error("Invalid shared formula coordinate");
  const dc = to.column - from.column, dr = to.row - from.row;
  const shiftColumn = (value: string) => {
    const absolute = value.startsWith("$");
    const number = columnNumber(value.replace("$", "")) + (absolute ? 0 : dc);
    return number < 1 || number > MAX_COLUMN ? "#REF!" : `${absolute ? "$" : ""}${columnName(number)}`;
  };
  const shiftRow = (value: string) => {
    const absolute = value.startsWith("$");
    const number = Number(value.replace("$", "")) + (absolute ? 0 : dr);
    return number < 1 || number > MAX_ROW ? "#REF!" : `${absolute ? "$" : ""}${number}`;
  };
  const shiftCell = (value: string) => {
    const match = /^(\$?[A-Z]{1,3})(\$?[1-9]\d*)$/i.exec(value)!;
    const column = shiftColumn(match[1]), row = shiftRow(match[2]);
    return column === "#REF!" || row === "#REF!" ? "#REF!" : column + row;
  };
  return formulaTokens(formula).map(token => {
    if (token.kind !== "reference") return token.text;
    if (token.text.includes(":")) return token.text.split(":").map(/[A-Z]/i.test(token.text) ? shiftColumn : shiftRow).join(":");
    return shiftCell(token.text);
  }).join("");
}
