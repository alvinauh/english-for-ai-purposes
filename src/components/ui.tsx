"use client";

import { useState } from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-strong disabled:opacity-50"
      : "border border-line bg-surface hover:bg-subtle disabled:opacity-50";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** navigator.clipboard only exists on https/localhost; fall back to a hidden textarea on plain http. */
async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      return await navigator.clipboard.writeText(text);
    } catch {
      // permission denied: try the fallback
    }
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      className="!px-2.5 !py-1 text-xs"
      onClick={async () => {
        await copyText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </Button>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </span>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{message}</p>;
}

const SOCRATIC_LABELS: Record<string, string> = {
  clarification: "Clarify",
  assumptions: "Assumptions",
  evidence: "Evidence",
  viewpoints: "Viewpoints",
  implications: "Implications",
  meta: "The question",
};

export function SocraticTag({ type }: { type: string }) {
  return (
    <span className="rounded-full bg-socratic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-socratic-ink">
      {SOCRATIC_LABELS[type] ?? type}
    </span>
  );
}
