import type { Metadata } from "next";
import Link from "next/link";
import { Layers3 } from "lucide-react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = { title: "Реестр процессов · Первичный анализ", description: "Анализ процессов на основе официального реестра" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><a className="skip-link" href="#main">К содержимому</a><header className="app-header"><div className="app-header-inner"><Link href="/registry" className="brand"><Layers3 size={23} aria-hidden="true" /><span>Реестр процессов</span></Link><span className="app-subtitle">Аналитический кабинет</span></div></header><main id="main" className="app-main">{children}</main><footer className="app-footer">Официальный источник сохраняется без изменений</footer></body></html>;
}
