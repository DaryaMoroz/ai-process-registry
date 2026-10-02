"use client";

import { useEffect, useState } from "react";
import type { SourceDetailsView, Value } from "@/shared/contracts";
import { api as defaultApi, errorMessage, type Api } from "@/shared/api";
import { Alert, Badge, Button, Drawer, Skeleton } from "@/shared/ui";

export const displayValue = (value: Value | undefined) => value == null ? "—" : typeof value === "boolean" ? value ? "Да" : "Нет" : String(value);
export function SourceDrawer({ sourceReferenceId, onClose, api = defaultApi }: { sourceReferenceId: string; onClose: () => void; api?: Api }) {
  const [id, setId] = useState(sourceReferenceId);
  const [source, setSource] = useState<SourceDetailsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.readSource(id).then(result => { if (!cancelled) setSource(result); }).catch(e => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [api, id, attempt]);
  const navigate = (next: string) => { setSource(null); setError(null); setId(next); };
  return <Drawer title="Источник и evidence" onClose={onClose}>
    {error ? <Alert retry={() => { setError(null); setAttempt(n => n + 1); }}>{error}</Alert> : !source ? <Skeleton label="Загрузка источника…" /> : <>
      <dl className="metadata source-metadata">
        <dt>Тип источника</dt><dd><Badge>{source.sourceType}</Badge></dd>
        <dt>Статус факта</dt><dd><Badge>{source.factStatus ?? "—"}</Badge></dd>
        <dt>Источник</dt><dd>{source.sourceName ?? "—"}</dd>
        {source.sourceRole && <><dt>Роль источника</dt><dd>{source.sourceRole}</dd></>}
        {source.sheet && <><dt>Лист</dt><dd>{source.sheet}</dd></>}
        {source.row != null && <><dt>Строка</dt><dd>{source.row}</dd></>}
        {source.coordinate && <><dt>Ячейка</dt><dd className="mono">{source.coordinate}</dd></>}
        <dt>Значение / фрагмент</dt><dd className="source-excerpt">{displayValue(source.excerptOrValue)}</dd>
        {source.verificationState && <><dt>Проверка</dt><dd className="mono">{source.verificationState}</dd></>}
      </dl>
      {source.derivation && <section className="derivation"><h3>Происхождение расчётного факта</h3><p className="mono">{source.derivation.ruleId}</p><p>Версия: {source.derivation.ruleVersion}</p>
        {source.derivation.trace && <p>{source.derivation.trace}</p>}
        <h4>Исходные evidence</h4><div className="source-links">{source.derivation.inputSourceReferenceIds.map((ref, index) => <Button key={ref} variant="secondary" onClick={() => navigate(ref)}>Источник {index + 1}</Button>)}</div>
      </section>}
    </>}
  </Drawer>;
}
