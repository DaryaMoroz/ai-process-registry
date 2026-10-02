import { after } from "next/server";
import { service } from "@/server/runtime";
import { ApplicationError, safeError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const string = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  if (typeof value !== "string" || !value || value.length > 2048) throw new ApplicationError("INVALID_REQUEST", "Параметры операции некорректны.");
  return value;
};
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new ApplicationError("ORIGIN_NOT_ALLOWED", "Источник запроса не разрешён.", 403);
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new ApplicationError("FILE_REQUIRED", "Выберите файл реестра.");
      const profile = form.get("profileId");
      if (profile !== null && typeof profile !== "string") throw new ApplicationError("INVALID_REQUEST", "Некорректный профиль.");
      return json(service().upload(new Uint8Array(await file.arrayBuffer()), file.name, profile ?? undefined));
    }
    let input: unknown;
    try { input = await request.json(); } catch { throw new ApplicationError("INVALID_REQUEST", "Некорректный формат запроса."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApplicationError("INVALID_REQUEST", "Некорректный запрос.");
    const data = input as Record<string, unknown>;
    switch (string(data, "operation")) {
      case "SelectSheetForProcessing": {
        const id = string(data, "registryVersionId");
        const result = service().selectSheet(id, string(data, "sheetName"));
        after(() => service().processSheet(id, result.runId));
        return json(result.view);
      }
      case "ReadRegistryProcessing": return json(service().readRegistry(string(data, "registryVersionId")));
      case "OpenProcessCard":
      case "RetryProcessPreScore": {
        const id = string(data, "processId");
        const result = data.operation === "OpenProcessCard" ? service().openProcess(id) : service().retryScore(id);
        if (result.job) { const job = result.job; after(() => service().runScore(job)); }
        return json(result.view);
      }
      case "ReadProcessCard": return json(service().readProcess(string(data, "processId")));
      case "ReadSourceDetails": return json(service().readSource(string(data, "sourceReferenceId")));
      default: throw new ApplicationError("UNKNOWN_OPERATION", "Операция не поддерживается.");
    }
  } catch (error) {
    const failure = safeError(error);
    return json({ error: { code: failure.code, message: failure.message } }, failure.status);
  }
}
