"use client";

import { useEffect, useRef, useState } from "react";
import { api as defaultApi, errorMessage, type Api } from "@/shared/api";
import type { RegistryProcessingView } from "@/shared/contracts";
import { Alert, Card } from "@/shared/ui";
import { SourceDrawer } from "@/features/source/SourceDrawer";
import { ProcessSelection, RegistryFileSummary, RegistryIssues, RegistryUpload, RegistryValidationSummary, SheetSelection } from "./components";

const sessionKey = "registry-slice-current-upload";
export function RegistryPage({ api = defaultApi }: { api?: Api }) {
  const [registry, setRegistry] = useState<RegistryProcessingView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const epoch = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const current = (ticket: number) => mounted.current && epoch.current === ticket;
  useEffect(() => {
    const requestEpoch = epoch;
    mounted.current = true;
    const ticket = ++requestEpoch.current;
    const id = sessionStorage.getItem(sessionKey);
    if (id) api.readRegistry(id).then(result => { if (current(ticket)) setRegistry(result); }).catch(() => { if (current(ticket)) sessionStorage.removeItem(sessionKey); });
    return () => { mounted.current = false; requestEpoch.current++; };
  }, [api]);
  useEffect(() => {
    if (!registry || registry.state !== "READING" || !registry.processingRunId) return;
    const ticket = epoch.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await api.readRegistry(registry.registryVersionId);
        if (cancelled || !current(ticket)) return;
        const sameRun = result.registryVersionId === registry.registryVersionId && result.processingRunId === registry.processingRunId && result.selectedSheet === registry.selectedSheet;
        if (sameRun) setRegistry(result);
        if (!sameRun || result.state === "READING") timer = setTimeout(poll, 400);
      } catch (e) { if (!cancelled && current(ticket)) setError(errorMessage(e)); }
    };
    timer = setTimeout(poll, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [api, registry]);

  const select = (base: RegistryProcessingView, sheet: string, ticket = ++epoch.current) => {
    setError(null); setSelected(""); setSource(null);
    setRegistry({ ...base, processingRunId: null, selectedSheet: sheet, state: "READING", canContinue: false, selectableProcesses: [], issues: [], error: null });
    // Serialize mutations so rapid sheet choices also reach the backend in user order.
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (!current(ticket)) return;
      try {
        const result = await api.selectSheet(base.registryVersionId, sheet);
        if (current(ticket)) setRegistry(result);
      } catch (e) { if (current(ticket)) setError(errorMessage(e)); }
    });
  };
  const upload = async (file: File) => {
    const ticket = ++epoch.current;
    setBusy(true); setError(null); setRegistry(null); setSelected(""); setSource(null); sessionStorage.removeItem(sessionKey);
    try {
      const metadata = await api.upload(file);
      if (!current(ticket)) return;
      sessionStorage.setItem(sessionKey, metadata.registryVersionId);
      select({ ...metadata, processingRunId: null, canContinue: false, issues: [], selectableProcesses: [], error: null }, metadata.defaultSheet, ticket);
    } catch (e) { if (current(ticket)) setError(errorMessage(e)); }
    finally { if (current(ticket)) setBusy(false); }
  };
  return <div className="registry-page"><header className="page-heading"><p className="eyebrow">Анализ реестра процессов</p><h1>Загрузка реестра</h1><p>Загрузите Excel, выберите лист и откройте процесс для первичной оценки.</p></header>
    <RegistryUpload busy={busy} onFile={upload} />
    {error && <Alert retry={registry ? () => select(registry, registry.selectedSheet) : undefined}>{error}</Alert>}
    {registry && <><Card><RegistryFileSummary registry={registry} /><SheetSelection registry={registry} onSelect={sheet => select(registry, sheet)} /><RegistryValidationSummary registry={registry} retry={() => select(registry, registry.selectedSheet)} />
      {registry.state !== "READING" && <details className="registry-issues" open={registry.state === "ERROR"}><summary>Качество данных · {registry.issues.length}</summary><RegistryIssues issues={registry.issues} onSource={setSource} /></details>}
    </Card><ProcessSelection registry={registry} selected={selected} onSelect={setSelected} /></>}
    {source && <SourceDrawer key={source} sourceReferenceId={source} onClose={() => setSource(null)} api={api} />}
  </div>;
}
