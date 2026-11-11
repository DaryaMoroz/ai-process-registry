import type { FactValue } from "../domain";
import type { Condition } from "./config";
import { ownValue } from "../lookup";

// Three-valued evaluation: unknown evidence never makes a rule applicable.
export type Decision = true | false | null;
const combine = (values: Decision[], mode: "all" | "any"): Decision => mode === "all"
  ? values.includes(false) ? false : values.includes(null) ? null : true
  : values.includes(true) ? true : values.includes(null) ? null : false;
function property(value: FactValue | undefined, key: string): FactValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? ownValue(value, key) : undefined;
}
function scalar(value: FactValue | undefined, op: string, expected: unknown): Decision {
  if (value === null || value === undefined) return null;
  switch (op) {
    case "eq": return value === expected;
    case "ne": return value !== expected;
    case "in": return Array.isArray(expected) && expected.includes(value);
    case "lt": return typeof value === "number" && typeof expected === "number" ? value < expected : null;
    case "lte": return typeof value === "number" && typeof expected === "number" ? value <= expected : null;
    case "gt": return typeof value === "number" && typeof expected === "number" ? value > expected : null;
    case "gte": return typeof value === "number" && typeof expected === "number" ? value >= expected : null;
    case "is_null": return false;
    case "is_not_null": return true;
    default: return null;
  }
}
export function evaluateCondition(condition: Condition, values: ReadonlyMap<string, FactValue>): Decision {
  if ("all" in condition) return combine(condition.all.map(c => evaluateCondition(c, values)), "all");
  if ("any" in condition) return combine(condition.any.map(c => evaluateCondition(c, values)), "any");
  const [field, member] = condition.path.split(".");
  const value = values.get(field);
  if (value === null || value === undefined) return null;
  if (!condition.op.startsWith("count_") && !["all_items", "any_item"].includes(condition.op)) return scalar(value, condition.op, condition.value);
  if (!Array.isArray(value)) return null;
  const candidates = value.map(item => ({ item, included: combine(Object.entries(condition.filter ?? {}).map(([key, expected]) => scalar(property(item, key), "eq", expected)), "all") }));
  const decisions = candidates.filter(c => c.included !== false).map(c => {
    // count_items on a member counts confirmed true flags; value is the count threshold.
    const decision = member ? scalar(property(c.item, member), "eq", condition.op.startsWith("count_items_") ? true : condition.value) : true;
    if (c.included !== null) return decision;
    if (condition.op === "all_items") return decision === true ? true : null;
    return decision === false ? false : null;
  });
  if (condition.op === "all_items") return combine(decisions, "all");
  if (condition.op === "any_item") return combine(decisions, "any");
  const lower = decisions.filter(d => d === true).length, upper = lower + decisions.filter(d => d === null).length;
  const target = Number(condition.value);
  switch (condition.op) {
    case "count_eq": case "count_items_eq": return lower === upper ? lower === target : target < lower || target > upper ? false : null;
    case "count_gte": case "count_items_gte": return lower >= target ? true : upper < target ? false : null;
    case "count_lte": case "count_items_lte": return upper <= target ? true : lower > target ? false : null;
    case "count_between": return lower >= condition.min! && upper <= condition.max! ? true : upper < condition.min! || lower > condition.max! ? false : null;
    default: return null;
  }
}
export function conditionFields(condition: Condition): string[] {
  return "all" in condition ? condition.all.flatMap(conditionFields) : "any" in condition ? condition.any.flatMap(conditionFields) : [condition.path.split(".")[0]];
}
