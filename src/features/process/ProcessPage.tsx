"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api as defaultApi, errorMessage, type Api } from "@/shared/api";
import type { ProcessCardView } from "@/shared/contracts";
import { isSlice02Snapshot, isProcessCardEnvelope } from "@/shared/scoreContract";
import { Alert, Card, Skeleton } from "@/shared/ui";
import { SourceDrawer, displayValue } from "@/features/source/SourceDrawer";
import { CalculationDetails, DataQualityPanel, ExplainabilityTrigger, ProcessHeader, ScoreAxisCard, ScoreConcerns } from "./components";

export function ProcessPage({ processId, api = defaultApi }: { processId: string; api?: Api }) {
  const [loadedCard, setCard] = useState<ProcessCardView | null>(null);
  const card = loadedCard?.processId === processId ? loadedCard : null;
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const epoch = useRef(0);
  useEffect(() => {
    const requestEpoch = epoch;
    const ticket = ++requestEpoch.current;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async (open = false) => {
      try {
        const result = await (open ? api.openProcess(processId) : api.readProcess(processId));
        if (ticket !== epoch.current) return;
        if (!isProcessCardEnvelope(result) || result.processId !== processId) throw new Error("Не удалось загрузить карточку: данные не соответствуют контракту.");
        setCard(result); setError(null);
        if (["PENDING", "RUNNING"].includes(result.scoreProcessing.state)) timer = setTimeout(() => refresh(), 400);
      } catch (e) { if (ticket === epoch.current) setError(errorMessage(e)); }
    };
    void refresh(true);
    return () => { requestEpoch.current++; clearTimeout(timer); };
  }, [api, processId, loadAttempt]);
  const retry = async () => {
    if (retrying || !card?.scoreProcessing.error?.retryable) return;
    setRetrying(true); setError(null);
    const ticket = epoch.current;
    try {
      const result = await api.retryScore(processId);
      if (!isProcessCardEnvelope(result) || result.processId !== processId) throw new Error("Не удалось загрузить карточку: данные не соответствуют контракту.");
      if (ticket === epoch.current) { setCard(result); setLoadAttempt(n => n + 1); }
    } catch (e) { if (ticket === epoch.current) setError(errorMessage(e)); }
    finally { if (ticket === epoch.current) setRetrying(false); }
  };
  const snapshot = card?.scoreProcessing.state === "AVAILABLE" && card.scoreProcessing.error === null && isSlice02Snapshot(card.activeScoreSnapshot) ? card.activeScoreSnapshot : null;
  const contractError = !!card && (card.scoreProcessing.state === "AVAILABLE" ? !snapshot : card.activeScoreSnapshot !== null ||
    (card.scoreProcessing.state === "FAILED" ? !card.scoreProcessing.error : card.scoreProcessing.error !== null));
  return <div className="process-page"><Link href="/registry" className="back-link"><ArrowLeft size={16} aria-hidden="true" />К реестру</Link>
    {error && <Alert retry={() => { setError(null); setLoadAttempt(n => n + 1); }}>{error}</Alert>}
    {!card ? !error && <Card><Skeleton label="Загрузка карточки процесса…" /></Card> : <>
      <ProcessHeader card={{ ...card, activeScoreSnapshot: snapshot }} onSource={setSource} />
      <p role="status" aria-live="polite">{{ PENDING: "Ожидает расчёта", RUNNING: "Расчёт выполняется", AVAILABLE: "Расчёт доступен", FAILED: "Ошибка расчёта" }[card.scoreProcessing.state]}</p>
      {contractError && <Alert>Не удалось отобразить результат расчёта: данные результата не соответствуют контракту</Alert>}
      {!contractError && card.scoreProcessing.state === "FAILED" && <Alert retry={card.scoreProcessing.error?.retryable && !retrying ? retry : undefined}><strong>Не удалось рассчитать PRE-SCORE</strong><p>{card.scoreProcessing.error?.message}</p>{retrying && <p>Повтор расчёта…</p>}</Alert>}
      {!contractError && <div className="axis-grid">{snapshot ? <><ScoreAxisCard label="Ценность" axis={snapshot.value} onSource={setSource} /><ScoreAxisCard label="Реализуемость" axis={snapshot.feasibility} onSource={setSource} /></> : <>
        <Card><h2>Ценность</h2><Skeleton label={card.scoreProcessing.state === "FAILED" ? "Результат отсутствует" : card.scoreProcessing.state === "RUNNING" ? "Расчёт PRE-SCORE выполняется…" : "Расчёт PRE-SCORE ожидает запуска…"} /></Card><Card><h2>Реализуемость</h2><Skeleton label={card.scoreProcessing.state === "FAILED" ? "Результат отсутствует" : card.scoreProcessing.state === "RUNNING" ? "Расчёт PRE-SCORE выполняется…" : "Расчёт PRE-SCORE ожидает запуска…"} /></Card>
      </>}</div>}
      {snapshot && <p className="small muted">Методика {snapshot.methodologyVersion} · Первичная оценка по данным реестра</p>}
      {snapshot && (snapshot.value.fullScore === null || snapshot.feasibility.fullScore === null) && <p className="small muted">Границы учитывают известные оценки и допустимые значения неизвестных критериев. Это не вероятностный прогноз.</p>}
      <DataQualityPanel issues={card.dataQualityIssues} onSource={setSource} />
      {snapshot && <><ScoreConcerns snapshot={snapshot} onSource={setSource} /><CalculationDetails snapshot={snapshot} /></>}
      <Card><details><summary>Исходные факты реестра</summary><dl className="facts">{card.sourceFacts.map((fact, index) => <div key={`${fact.label}:${index}`}><dt>{fact.label}</dt><dd>{displayValue(fact.value)}{fact.unit && <span className="muted small"> · {fact.unit}</span>}<span className="small muted"> · {fact.factStatus}</span><div>{fact.sourceReferenceIds.map(id => <ExplainabilityTrigger key={id} sourceReferenceId={id} onSource={setSource} />)}</div></dd></div>)}</dl></details></Card>
    </>}
    {source && <SourceDrawer key={source} sourceReferenceId={source} onClose={() => setSource(null)} api={api} />}
  </div>;
}
