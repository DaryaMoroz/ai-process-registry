"use client";

import { ExternalLink, FileSpreadsheet } from "lucide-react";
import type { DataQualityIssueViewModel, ProcessCardView, ScoreAxisViewModel, ScoreCriterionViewModel, ScoreStatus } from "@/shared/contracts";
import { Badge, Button, Card } from "@/shared/ui";
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
    <details><summary>Обоснование и источники</summary><div className="criterion-detail">{criterion.explanation && <p>{criterion.explanation}</p>}{criterion.ruleId && <p className="mono small wrap">{criterion.ruleId}</p>}
      {!!criterion.missingInputs.length && <p className="small muted">Недостающие данные: {criterion.missingInputs.join(", ")}</p>}
      <div className="source-links">{criterion.sourceReferenceIds.map((id, index) => <ExplainabilityTrigger key={id} sourceReferenceId={id} label={`Источник ${index + 1}`} onSource={onSource} />)}</div></div>
    </details>
  </li>;
}
export function ScoreAxisCard({ label, axis, onSource }: { label: string; axis: ScoreAxisViewModel; onSource: (id: string) => void }) {
  const partial = axis.fullScore === null;
  return <Card className="score-axis"><h2>{label}</h2><div className="axis-result"><span className="axis-number">{partial ? axis.range ? `${axis.range[0]}–${axis.range[1]}` : "—" : axis.fullScore}</span>{(!partial || axis.range) && <span className="axis-max"> / {axis.maxScore}</span>}</div>
    <p className="result-label">{partial ? "Диапазон при неполных данных" : "Полная оценка оси"}</p><div className="axis-metadata">{partial && <span>Известная сумма: <strong>{axis.knownSum}</strong></span>}<span>Coverage <strong>{new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 0 }).format(axis.coverage)}</strong></span></div>
    <ul className="criteria">{axis.criteria.map(c => <CriterionRow key={c.id} criterion={c} onSource={onSource} />)}</ul>
  </Card>;
}
export function DataQualityPanel({ issues, onSource }: { issues: DataQualityIssueViewModel[]; onSource: (id: string) => void }) {
  return <Card><div className="section-heading"><h2>Качество данных</h2><Badge>{issues.length}</Badge></div><RegistryIssues issues={issues} onSource={onSource} /></Card>;
}
