import type { ProcessCardView, RegistryProcessingView, SourceDetailsView, WorkbookMetadataResult } from "./contracts";

async function request<T>(body: FormData | Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/operations", {
    method: "POST", cache: "no-store",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error?.message ?? "Сервер не завершил операцию. Повторите попытку.");
  if (result === null) throw new Error("Сервер вернул пустой ответ.");
  return result as T;
}
export const api = {
  upload(file: File): Promise<WorkbookMetadataResult> { const body = new FormData(); body.set("file", file); return request(body); },
  selectSheet: (registryVersionId: string, sheetName: string) => request<RegistryProcessingView>({ operation: "SelectSheetForProcessing", registryVersionId, sheetName }),
  readRegistry: (registryVersionId: string) => request<RegistryProcessingView>({ operation: "ReadRegistryProcessing", registryVersionId }),
  openProcess: (processId: string) => request<ProcessCardView>({ operation: "OpenProcessCard", processId }),
  readProcess: (processId: string) => request<ProcessCardView>({ operation: "ReadProcessCard", processId }),
  retryScore: (processId: string) => request<ProcessCardView>({ operation: "RetryProcessPreScore", processId }),
  readSource: (sourceReferenceId: string) => request<SourceDetailsView>({ operation: "ReadSourceDetails", sourceReferenceId }),
};
export type Api = typeof api;
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Не удалось завершить операцию.";
