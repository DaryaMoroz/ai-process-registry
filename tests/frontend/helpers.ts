import { vi } from "vitest";
import type { Api } from "../../src/shared/api";
import type { ProcessCardView, RegistryProcessingView, WorkbookMetadataResult } from "../../src/shared/contracts";
import { cardFixture, registryFixture, registrySource } from "../fixtures/contracts";

export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const registry = (overrides: Partial<RegistryProcessingView> = {}): RegistryProcessingView => ({ ...structuredClone(registryFixture), ...overrides });
export const card = (overrides: Partial<ProcessCardView> = {}): ProcessCardView => ({ ...structuredClone(cardFixture), ...overrides });
export const metadata = (): WorkbookMetadataResult => ({ ...registry(), state: "READING" });
export function apiStub(overrides: Partial<Api> = {}): Api {
  return {
    upload: vi.fn(async () => metadata()),
    selectSheet: vi.fn(async (_id: string, sheet: string) => registry({ selectedSheet: sheet, state: "READING", canContinue: false, selectableProcesses: [] })),
    readRegistry: vi.fn(async () => registry()),
    openProcess: vi.fn(async () => card()), readProcess: vi.fn(async () => card()), retryScore: vi.fn(async () => card()),
    readSource: vi.fn(async () => structuredClone(registrySource)), ...overrides,
  };
}
