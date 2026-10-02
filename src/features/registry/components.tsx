"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import type { DataQualityIssueViewModel, RegistryProcessingView } from "@/shared/contracts";
import { Alert, Badge, Button, Card } from "@/shared/ui";

export function RegistryUpload({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <Card><div className={`upload-area ${dragging ? "dragging" : ""}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !busy) onFile(file); }}>
    <div className="upload-icon"><Upload size={26} aria-hidden="true" /></div>
    <h2>Загрузите официальный реестр</h2><p>Перетащите файл сюда или выберите его на компьютере</p>
    <input ref={input} type="file" accept=".xlsx,.xlsm" aria-label="Файл реестра" className="sr-only" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} />
    <Button disabled={busy} onClick={() => input.current?.click()}>{busy ? "Чтение файла…" : "Выбрать файл"}</Button><p className="small muted">Excel · .xlsx, .xlsm</p>
  </div><p className="source-notice"><ShieldCheck size={18} aria-hidden="true" /> Исходный реестр не изменяется. Аналитика формируется в отдельном внутреннем слое.</p></Card>;
}
export function RegistryFileSummary({ registry }: { registry: RegistryProcessingView }) {
  return <div><div className="section-heading"><FileSpreadsheet size={21} aria-hidden="true" /><h2>{registry.fileName}</h2><Badge>Read-only</Badge></div>
    <dl className="metadata"><dt>Размер</dt><dd>{new Intl.NumberFormat("ru-RU").format(registry.fileSize)} байт</dd><dt>Профиль</dt><dd className="mono">{registry.profileId} · {registry.mappingVersion}</dd>
      <dt>SHA-256</dt><dd className="mono wrap">{registry.checksum}</dd><dt>Версия загрузки</dt><dd className="mono wrap">{registry.registryVersionId}</dd></dl>
  </div>;
}
export function SheetSelection({ registry, onSelect }: { registry: RegistryProcessingView; onSelect: (name: string) => void }) {
  return <div className="sheet-selection"><label htmlFor="sheet">Лист для обработки</label><select id="sheet" value={registry.selectedSheet} onChange={e => onSelect(e.target.value)}>
    {!registry.availableSheets.some(s => s.name === registry.selectedSheet) && <option value={registry.selectedSheet}>{registry.selectedSheet} — отсутствует</option>}
    {registry.availableSheets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
  </select><p className="small muted">Лист по умолчанию: {registry.defaultSheet}</p></div>;
}
const statuses = { READING: ["Обработка листа", "info"], VALID: ["Реестр проверен", "success"], WARNING: ["Обработка завершена с замечаниями", "warning"], ERROR: ["Лист не обработан", "error"] };
export function RegistryValidationSummary({ registry, retry }: { registry: RegistryProcessingView; retry: () => void }) {
  const [label, tone] = statuses[registry.state];
  return <div className="validation-summary" aria-live="polite"><Badge tone={tone}>{label}</Badge>
    {registry.state === "READING" ? <p>Чтение данных и проверка структуры…</p> : registry.error ? <Alert retry={retry}>{registry.error.message}<p className="mono small">{registry.error.code}</p></Alert> : <p>{registry.canContinue ? "Выберите процесс, чтобы открыть карточку анализа." : "Нет процессов, доступных для выбора."}</p>}
  </div>;
}
export function RegistryIssues({ issues, onSource }: { issues: DataQualityIssueViewModel[]; onSource: (id: string) => void }) {
  if (!issues.length) return <p className="muted small">Замечаний к качеству данных нет.</p>;
  return <ul className="issue-list">{issues.map(issue => <li key={issue.id}><div className="issue-heading"><Badge tone={issue.severity === "ERROR" ? "error" : issue.severity === "WARNING" ? "warning" : "info"}>{issue.severity}</Badge><span className="mono small">{issue.code}</span></div>
    <p>{issue.message}</p>{issue.field && <p className="small muted mono">{issue.field}</p>}
    {issue.affectsScoring != null && <p className="small muted">{issue.affectsScoring ? "Может влиять на scoring" : "Не блокирует scoring"}</p>}
    {issue.sourceReferenceIds.map(ref => <Button key={ref} variant="quiet" onClick={() => onSource(ref)}><ExternalLink size={14} aria-hidden="true" />Источник</Button>)}
  </li>)}</ul>;
}
export function ProcessSelection({ registry, selected, onSelect }: { registry: RegistryProcessingView; selected: string; onSelect: (id: string) => void }) {
  const allowed = registry.canContinue && ["VALID", "WARNING"].includes(registry.state);
  if (!allowed) return null;
  const validSelection = registry.selectableProcesses.some(p => p.processId === selected);
  return <Card><h2>Выберите процесс</h2><p className="muted">Доступно для анализа: {registry.selectableProcesses.length}</p>
    <fieldset className="process-options"><legend className="sr-only">Процессы реестра</legend>{registry.selectableProcesses.map(p => <label key={p.processId} className={`process-option ${selected === p.processId ? "selected" : ""}`}>
      <input type="radio" name="process" value={p.processId} checked={selected === p.processId} onChange={() => onSelect(p.processId)} /><span><strong>{p.processName}</strong><span className="small muted">{p.sourceRef}</span><span className="mono small muted">ID: {p.processId}</span>{p.officialProcessCode && <span className="small muted">Официальный код: {p.officialProcessCode}</span>}</span>
    </label>)}</fieldset>
    <div className="selection-footer">{validSelection ? <Link className="button button-primary" href={`/process/${encodeURIComponent(selected)}`}>Открыть карточку <ArrowRight size={16} aria-hidden="true" /></Link> : <Button disabled>Открыть карточку <ArrowRight size={16} aria-hidden="true" /></Button>}</div>
  </Card>;
}
