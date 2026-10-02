// Literal implementation of REGISTRY_MAPPING_MLH.md v1.0.0; no scoring rules.
import type { RowType } from "../domain";
import type { ParsedSheet } from "./parser";
export type Column = { header: string; field: string; required?: boolean; numeric?: boolean; unit?: string; enums?: Record<string, string> };
export const PROFILE = { id: "registry_mlh", version: "1.0.0", fingerprintVersion: "mlh-fp-v1", defaultSheet: "Лист3" };
// Explicit classification belongs to this reviewed source, never to arbitrary Excel row numbers.
const rowTypeMappings: readonly { checksum: string; sheet: string; rows: Readonly<Record<number, RowType>> }[] = [{
  checksum: "7f5dbcf3a62ca03b7ff37e9f4cef432db8e927f7c4a3744d9611c9fa857a3f02",
  sheet: "Лист3",
  rows: { 9: "PROCESS", 10: "PROCESS", 11: "PROCESS", 12: "PROCESS", 13: "AGGREGATE", 14: "PROCESS", 15: "AGGREGATE", 16: "AGGREGATE", 17: "PROCESS" },
}];
export function explicitRowType(sheet: Pick<ParsedSheet, "name" | "sourceChecksum">, row: number): RowType | undefined {
  return rowTypeMappings.find(mapping => mapping.checksum === sheet.sourceChecksum && mapping.sheet === sheet.name)?.rows[row];
}
export const columns: Column[] = [
  { header: "Министерство*", field: "ministry", required: true },
  { header: "Идентификатор процесса*", field: "official_process_code", required: true },
  { header: "Группа процессов", field: "process_group" },
  { header: "Название процесса*", field: "process_name", required: true },
  { header: "Ответственный за процесс*", field: "process_owner", required: true },
  { header: "Статус процесса (статус реинжиниринга)*", field: "reengineering_status", required: true, enums: {
    "в очереди на исследование": "queued_for_research", "проходит реинжиниринг": "in_reengineering", "прошел реинжиниринг": "reengineered",
  } },
  { header: "Клиент*", field: "client", required: true },
  { header: "Данные на входе (вход процесса)*", field: "process_input", required: true },
  { header: "Результат на выходе*", field: "process_output", required: true },
  { header: "Вид процесса*", field: "process_kind", required: true, enums: { "основной": "core", "вспомогательный": "supporting" } },
  { header: "Человеко/часы (на исполнение 1 экземпляра процесса)", field: "hours_per_instance", numeric: true, unit: "person_hours_per_instance" },
  { header: "Количество экземпляров процесса в год", field: "annual_instances", numeric: true, unit: "instances_per_year" },
  { header: "Признак сквозного процесса*", field: "cross_process_flag", required: true, enums: { "сквозной": "cross_functional", "несквозной": "non_cross_functional" } },
  { header: 'С кем сквозной \n(заполняется, если в предыдущем столбе выбрано "сквозной")', field: "cross_process_parties" },
  { header: "Роль Министерства в сквозном потоке", field: "ministry_role_in_cross_process" },
  { header: "Тип процесса*", field: "paper_status", required: true, enums: { "бумажный": "paper", "безбумажный": "paperless" } },
  { header: "Формат процесса*", field: "digitalization_level", required: true, enums: { "цифровой": "digital", "частично цифровой": "partially_digital", "нецифровой": "non_digital" } },
  { header: "Машиночитаемость в процессе*", field: "machine_readability", required: true, enums: { "машиночитаемый": "machine_readable", "частично машиночитаемый": "partially_machine_readable", "немашиночитаемый": "non_machine_readable" } },
  { header: "Точка размещения в цифровом виде", field: "digital_location" },
];
