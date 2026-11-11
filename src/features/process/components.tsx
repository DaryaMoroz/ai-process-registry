"use client";

import { ExternalLink, FileSpreadsheet } from "lucide-react";
import type { DataQualityIssueViewModel, ProcessCardView, ScoreAxisViewModel, ScoreCriterionViewModel, ScoreStatus, Slice02Snapshot, ScoreConcernViewModel } from "@/shared/contracts";
import { Badge, Button, Card, Disclosure } from "@/shared/ui";
import { RegistryIssues } from "@/features/registry/components";

export function ScoreStatusBadge({ stage }: { stage: ScoreStatus }) {
  return <Badge tone="info">{{ PRE_SCORE: "PRE-SCORE", INTERVIEW_SCORE: "INTERVIEW SCORE", VERIFIED_SCORE: "VERIFIED SCORE" }[stage]}</Badge>;
}
export function ProcessHeader({ card, onSource }: { card: ProcessCardView; onSource: (id: string) => void }) {
  return <header className="page-heading process-heading"><div className="heading-top"><p className="eyebrow">Карточка процесса</p>{card.activeScoreSnapshot && <ScoreStatusBadge stage={card.activeScoreSnapshot.stage} />}</div>
    <h1>{card.processName}</h1><p className="mono small wrap">ID: {card.processId}</p>
    <div className="source-line"><FileSpreadsheet size={17} aria-hidden="true" /><span>{card.sourceRegistry.fileName} · {card.sourceRegistry.sheetName} · строка {card.sourceRegistry.rowNumber}</span>
      {card.sourceRegistry.sourceReferenceId && <Button variant="quiet" onClick={() => onSource(card.sourceRegistry.sourceReferenceId!)}>Источник <ExternalLink size={14} aria-hidden="true" /></Button>}</div>
  </header>;
}
export function ExplainabilityTrigger({ sourceReferenceId, label = "Источник", onSource }: { sourceReferenceId: string; label?: string; onSource: (id: string) => void }) {
  return <Button variant="quiet" onClick={() => onSource(sourceReferenceId)}><ExternalLink size={14} aria-hidden="true" />{label}</Button>;
}
export function CriterionRow({ criterion, onSource }: { criterion: ScoreCriterionViewModel; onSource: (id: string) => void }) {
  return <li className="criterion"><div className="criterion-heading"><span><span className="criterion-id mono">{criterion.id}</span>{criterion.label}</span><strong className={criterion.score === null ? "muted" : ""}>{criterion.score ?? "—"}</strong></div>
    {criterion.explanation && <p>{criterion.explanation}</p>}
    {criterion.score === null && <span className="small muted">Нет оценки</span>}
    <Disclosure label="Обоснование и источники"><div className="criterion-detail">{criterion.ruleId && <p className="mono small wrap">{criterion.ruleId}</p>}
      {criterion.reasonCode && <p className="mono small wrap">Причина: {criterion.reasonCode}</p>}
      {criterion.appliedRuleTrace && <p className="mono small wrap">{criterion.appliedRuleTrace}</p>}
      {criterion.provenance && <p className="mono small wrap">Snapshot: {criterion.provenance.scoreSnapshotId} · Input facts: {criterion.provenance.inputFactIds.join(", ") || "—"}</p>}
      {!!criterion.conflictIds?.length && <p>Конфликты: {criterion.conflictIds.map(id => <a key={id} href={`#concern-${id}`}>{id} </a>)}</p>}
      {!!criterion.riskIds?.length && <p>Риски: {criterion.riskIds.map(id => <a key={id} href={`#concern-${id}`}>{id} </a>)}</p>}
      {!!criterion.blockerIds?.length && <p>Стоп-факторы: {criterion.blockerIds.map(id => <a key={id} href={`#concern-${id}`}>{id} </a>)}</p>}
      {!!criterion.missingInputs.length && <p className="small muted">Недостающие данные: {criterion.missingInputs.join(", ")}</p>}
      <div className="source-links">{criterion.sourceReferenceIds.map((id, index) => <ExplainabilityTrigger key={id} sourceReferenceId={id} label={`Источник ${index + 1}`} onSource={onSource} />)}</div></div>
    </Disclosure>
  </li>;
}
export function ScoreAxisCard({ label, axis, onSource }: { label: string; axis: ScoreAxisViewModel; onSource: (id: string) => void }) {
  const partial = axis.fullScore === null;
  return <Card className="score-axis"><h2>{label}</h2>{partial && <p className="result-label">Возможный диапазон при текущей полноте данных</p>}<div className="axis-result"><span className="axis-number">{partial ? axis.range ? `${axis.range[0]}–${axis.range[1]}` : "—" : axis.fullScore}</span>{(!partial || axis.range) && <span className="axis-max">{partial ? " баллов из " : " / "}{axis.maxScore}</span>}</div>
    {!partial && <p className="result-label">Полная оценка оси</p>}<div className="axis-metadata">{partial && <span>Известная сумма: <strong>{axis.knownSum}</strong></span>}<span>Полнота данных <strong>{new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 0 }).format(axis.coverage)}</strong></span></div>
    {axis.knownCount !== undefined && <p className="small muted">Оценены {axis.knownCount} из 5 · Без оценки {axis.unknownCount}</p>}
    <ul className="criteria">{axis.criteria.map(c => <CriterionRow key={c.id} criterion={c} onSource={onSource} />)}</ul>
  </Card>;
}
function ConcernGroup({ label, concerns, onSource }: { label: string; concerns: ScoreConcernViewModel[]; onSource: (id: string) => void }) {
  return <Card><h2>{label}</h2>{!concerns.length ? <p className="small muted">Нет зафиксированных записей</p> : <ul>{concerns.map(c => <li key={c.id} id={`concern-${c.id}`} className="wrap">
    <p>{c.description}</p><p className="small">{c.status} · {c.confirmationState}{c.severity && ` · ${c.severity}`}</p><p className="mono small">{c.code}</p>
    <p className="small">Критерии: {c.affectedCriterionIds.join(", ") || "Уровень процесса"}</p>{c.sourceReferenceIds.map(id => <ExplainabilityTrigger key={id} sourceReferenceId={id} onSource={onSource} />)}
  </li>)}</ul>}</Card>;
}
export function ScoreConcerns({ snapshot, onSource }: { snapshot: Slice02Snapshot; onSource: (id: string) => void }) {
  return <><ConcernGroup label="Риски" concerns={snapshot.risks} onSource={onSource} /><ConcernGroup label="Конфликты" concerns={snapshot.conflicts} onSource={onSource} /><ConcernGroup label="Стоп-факторы" concerns={snapshot.blockers} onSource={onSource} /></>;
}
export function CalculationDetails({ snapshot }: { snapshot: Slice02Snapshot }) {
  return <Card><Disclosure label="О расчёте"><dl className="facts">
    {Object.entries({ Методика: snapshot.methodologyVersion, Engine: snapshot.engineVersion, Конфигурация: snapshot.scoringConfigVersion, Контракт: snapshot.resultContractVersion,
      "Score snapshot": snapshot.scoreSnapshotId, "Input snapshot": snapshot.inputSnapshotId, "Время расчёта": snapshot.calculatedAt ?? "—" }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mono small wrap">{value}</dd></div>)}
  </dl></Disclosure></Card>;
}
export function DataQualityPanel({ issues, onSource }: { issues: DataQualityIssueViewModel[]; onSource: (id: string) => void }) {
  return <Card><div className="section-heading"><h2>Качество данных</h2><Badge>{issues.length}</Badge></div><RegistryIssues issues={issues} onSource={onSource} /></Card>;
}
