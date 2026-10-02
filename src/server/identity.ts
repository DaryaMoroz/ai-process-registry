import { createHash } from "node:crypto";

export const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
// Fixed namespace for source rows. ID belongs to one upload, not process identity.
const NS_SOURCE_ROW_MLH = "b71b3979-74f7-5123-887a-949e8de4306e";
export function sourceRowId(versionId: string, sheet: string, row: number): string {
  const hash = createHash("sha1")
    .update(Buffer.from(NS_SOURCE_ROW_MLH.replaceAll("-", ""), "hex"))
    .update(`${versionId}\n${sheet}\n${row}`, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const textValue = (value: string) => value.normalize("NFKC").replace(/\s+/gu, " ").trim();
export const token = (value: string) => textValue(value).toLowerCase().replaceAll("ё", "е");
export function fingerprint(fields: Record<string, unknown>): string | null {
  if (!fields.process_name) return null;
  const identity = Object.fromEntries(["ministry", "official_process_code", "process_group", "process_name", "process_kind"]
    .map(key => [key, fields[key] == null ? null : token(String(fields[key]))]));
  return `mlh-fp-v1:${sha256(JSON.stringify(identity))}`;
}
