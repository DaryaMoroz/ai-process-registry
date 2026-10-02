import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";

// Exercise page components and their application contracts without a Next router server.
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
// jsdom does not implement modal dialogs. Browser keyboard behavior remains a manual review item.
HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLButtonElement>("button")?.focus(); };
HTMLDialogElement.prototype.close = function () { this.open = false; };
afterEach(() => { cleanup(); sessionStorage.clear(); vi.useRealTimers(); });
