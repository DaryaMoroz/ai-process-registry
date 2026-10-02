"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X, AlertCircle, Info } from "lucide-react";

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" }) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Alert({ children, tone = "error", retry }: { children: ReactNode; tone?: "error" | "warning" | "info"; retry?: () => void }) {
  const Icon = tone === "info" ? Info : AlertCircle;
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon size={20} aria-hidden="true" /><div>{children}{retry && <div className="space-top"><Button variant="secondary" onClick={retry}>Повторить</Button></div>}</div></div>;
}
export function Skeleton({ label = "Загрузка…" }: { label?: string }) { return <div className="skeleton" role="status" aria-live="polite"><span>{label}</span><div /><div /><div /></div>; }
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="drawer" aria-labelledby="source-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="drawer-header"><h2 id="source-title">{title}</h2><Button variant="quiet" onClick={onClose} aria-label="Закрыть источник"><X size={20} /></Button></div>
    <div className="drawer-body">{children}</div>
  </dialog>;
}
