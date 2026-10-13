"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth";
import { Button, Card, CopyButton, ErrorNote, Spinner } from "@/components/ui";
import { getJSON, postJSON } from "@/lib/store";

interface Invite {
  code: string;
  note: string;
  created_at: string;
  used_at: string | null;
  used_by_name: string | null;
  used_by_username: string | null;
}

interface Overview {
  totals: { teachers: number; students: number; chats: number; activeThisWeek: number };
  classes: {
    id: string;
    name: string;
    code: string;
    teacher: string;
    students: number;
    activeThisWeek: number;
    chats: number;
    attempts: number;
    avgFirstCraft: number | null;
    avgLatestCraft: number | null;
    lastActive: string | null;
  }[];
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "–");

export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (!user?.isAdmin) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <p>This page is for admins.</p>
        <Link href="/login?next=/admin" className="text-accent underline">
          Log in
        </Link>
      </Card>
    );
  }
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <OverviewSection />
      <InvitesSection />
    </div>
  );
}

function OverviewSection() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getJSON<Overview>("/api/admin/overview")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner label="Loading overview…" />;
  const tiles = [
    { label: "Teachers", value: data.totals.teachers },
    { label: "Students", value: data.totals.students },
    { label: "Students active this week", value: data.totals.activeThisWeek },
    { label: "Prompt Lab chats", value: data.totals.chats },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">How everyone is doing</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="!p-4">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="text-3xl font-extrabold tabular-nums">{t.value}</p>
          </Card>
        ))}
      </div>
      {data.classes.length === 0 ? (
        <Card>No classes yet. Create one in the teacher dashboard, or give a teacher a sign-up code below.</Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Teacher</th>
                <th className="px-3 py-2 text-right">Students</th>
                <th className="px-3 py-2 text-right">Active (7 days)</th>
                <th className="px-3 py-2 text-right">Chats</th>
                <th className="px-3 py-2 text-right">Own attempts</th>
                <th className="px-3 py-2">Avg CRAFT first → latest</th>
                <th className="px-3 py-2">Last active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.classes.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <span className="font-semibold">{c.name}</span>
                    <span className="block font-mono text-xs text-muted">{c.code}</span>
                  </td>
                  <td className="px-3 py-2">{c.teacher}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.students}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.activeThisWeek}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.chats}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.attempts}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.avgLatestCraft === null ? (
                      "–"
                    ) : (
                      <>
                        {c.avgFirstCraft} → <strong>{c.avgLatestCraft}</strong>/5
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(c.lastActive)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/teacher?class=${c.id}`} className="text-accent hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InvitesSection() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getJSON<{ invites: Invite[] }>("/api/admin/invites")
      .then((d) => setInvites(d.invites))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { code } = await postJSON<{ code: string }>("/api/admin/invites", { note });
      setFresh(code);
      setNote("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function revoke(code: string) {
    if (!confirm(`Cancel code ${code}? It will stop working.`)) return;
    await fetch(`/api/admin/invites?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Teacher sign-up codes</h2>
        <p className="text-sm text-muted">
          Each code works once. Give it to a teacher: they open <strong>Log in → Teacher sign-up</strong> and type it. Students don&apos;t
          need these; they join with a class code from their teacher.
        </p>
      </div>
      <Card className="space-y-3">
        <form onSubmit={create} className="flex flex-wrap gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Who is it for? (optional, e.g. Pak Budi, Yangon cohort)"
            className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <Button type="submit">Generate code</Button>
        </form>
        {fresh && (
          <p className="flex flex-wrap items-center gap-3 rounded-lg bg-accent-soft p-3">
            <span className="font-mono text-2xl font-extrabold tracking-[0.15em]">{fresh}</span>
            <CopyButton text={fresh} />
          </p>
        )}
        <ErrorNote message={error} />
      </Card>
      {invites && invites.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">For</th>
                <th className="px-3 py-2">Made</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.code} className="border-t border-line">
                  <td className="px-3 py-2 font-mono">{i.code}</td>
                  <td className="px-3 py-2">{i.note || "–"}</td>
                  <td className="px-3 py-2">{fmt(i.created_at)}</td>
                  <td className="px-3 py-2">
                    {i.used_at ? (
                      <span>
                        Used by <strong>{i.used_by_name ?? "deleted account"}</strong>
                        {i.used_by_username && <span className="text-muted"> @{i.used_by_username}</span>} · {fmt(i.used_at)}
                      </span>
                    ) : (
                      <span className="text-green-700 dark:text-green-400">Unused</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {!i.used_at && (
                      <>
                        <CopyButton text={i.code} />{" "}
                        <button onClick={() => revoke(i.code)} className="text-xs text-muted hover:text-ink">
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
