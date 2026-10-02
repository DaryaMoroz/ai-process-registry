import { ApplicationError } from "../errors";

// Local parser budgets, independent of business row types and scoring. Not a product upload-size promise.
export const REGISTRY_LIMITS = Object.freeze({
  maxExpandedBytes: 256 * 1024 * 1024,
  maxZipEntries: 10000,
  maxWorksheetRows: 20000,
  maxWorksheetCells: 200000,
  maxTableRowSpan: 10000,
});
export type RegistryLimits = { [K in keyof typeof REGISTRY_LIMITS]: number };
export function resourceLimit(name: keyof RegistryLimits, actual: number, limit: number): never {
  throw new ApplicationError("WORKBOOK_RESOURCE_LIMIT", `Обработка остановлена: превышен технический лимит ${name} (${actual} > ${limit}).`, 422);
}
