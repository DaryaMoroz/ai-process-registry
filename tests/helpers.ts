import { readFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { columns } from "../src/server/registry/profile";
import { LocalStore } from "../src/server/store";
import { RegistryService } from "../src/server/service";

export const OFFICIAL_CHECKSUM = "7f5dbcf3a62ca03b7ff37e9f4cef432db8e927f7c4a3744d9611c9fa857a3f02";
export const official = () => readFileSync(path.join(process.cwd(), "source", "Реестр МЛХ.xlsm"));
export function mutateWorkbook(bytes: Uint8Array, entry: string, update: (xml: string) => string): Uint8Array {
  const files = unzipSync(bytes); files[entry] = strToU8(update(strFromU8(files[entry]))); return zipSync(files);
}
export const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function literal(coordinate: string, value: string | number | null): string {
  if (value === null) return `<c r="${coordinate}"/>`;
  return typeof value === "number" ? `<c r="${coordinate}"><v>${value}</v></c>` : `<c r="${coordinate}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}
export function synthetic(options: { name?: string; headerRow?: number; headers?: string[]; rows?: Record<number, string>; extra?: Record<string, string> } = {}): Uint8Array {
  const headerRow = options.headerRow ?? 8;
  const headers = options.headers ?? columns.map(c => c.header);
  const rows = options.rows ?? { 9: literal("A9", "Тестовое ведомство") + literal("B9", "ОП.") + literal("D9", "Тестовый процесс") + literal("K9", 4) + literal("L9", 12) };
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>'),
    "xl/workbook.xml": strToU8(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${options.name ?? "Лист3"}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:EA999"/><sheetData><row r="${headerRow}">${headers.map((h, i) => literal(`${String.fromCharCode(65 + i)}${headerRow}`, h)).join("")}</row>${Object.entries(rows).map(([row, cells]) => `<row r="${row}">${cells}</row>`).join("")}</sheetData></worksheet>`),
  };
  for (const [name, value] of Object.entries(options.extra ?? {})) files[name] = strToU8(value);
  return zipSync(files);
}
export function tempStore() {
  const base = path.resolve(".test-data"); mkdirSync(base, { recursive: true });
  const directory = mkdtempSync(path.join(base, "case-"));
  return { store: new LocalStore(directory), directory, cleanup: () => {
    if (!path.resolve(directory).startsWith(base + path.sep)) throw new Error("Unsafe test cleanup");
    rmSync(directory, { recursive: true, force: true });
  } };
}
export function importOfficial(service: RegistryService) {
  const metadata = service.upload(official(), "Реестр МЛХ.xlsm");
  const processing = service.selectSheet(metadata.registryVersionId, "Лист3");
  service.processSheet(metadata.registryVersionId, processing.runId);
  return service.readRegistry(metadata.registryVersionId);
}
