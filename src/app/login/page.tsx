"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, type SessionUser } from "@/components/auth";
import { Bi } from "@/components/lang";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { postJSON } from "@/lib/store";

type Mode = "login" | "student" | "teacher";

const TABS: { key: Mode; en: string; id: string; my: string }[] = [
  { key: "login", en: "Log in", id: "Masuk", my: "ဝင်ရောက်ရန်" },
  { key: "student", en: "Student: join a class", id: "Siswa: gabung kelas", my: "ကျောင်းသား: အတန်းဝင်ရန်" },
  { key: "teacher", en: "Teacher sign-up", id: "Daftar guru", my: "ဆရာ စာရင်းသွင်းရန်" },
];

const input = "w-full rounded-md border border-line bg-bg px-3 py-2 focus:border-accent focus:outline-none";

export default function LoginPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ username: "", password: "", displayName: "", classCode: "", teacherCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } =
        mode === "login"
          ? await postJSON<{ user: SessionUser }>("/api/auth/login", { username: form.username, password: form.password })
          : await postJSON<{ user: SessionUser }>("/api/auth/signup", {
              role: mode,
              username: form.username,
              password: form.password,
              displayName: form.displayName,
              classCode: mode === "student" ? form.classCode : undefined,
              teacherCode: mode === "teacher" ? form.teacherCode : undefined,
            });
      await refresh();
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : user.role === "teacher" ? "/teacher" : "/lab");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-extrabold">
        <Bi en="Your account" id="Akunmu" my="သင့်အကောင့်" />
      </h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setMode(t.key);
              setError(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              mode === t.key ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface hover:bg-subtle"
            }`}
          >
            <Bi en={t.en} id={t.id} my={t.my} />
          </button>
        ))}
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          {mode === "student" && (
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                <Bi en="Class code (from your teacher)" id="Kode kelas (dari gurumu)" my="အတန်းကုဒ် (ဆရာထံမှ)" />
              </span>
              <input required value={form.classCode} onChange={set("classCode")} className={`${input} uppercase tracking-widest`} />
            </label>
          )}
          {mode === "teacher" && (
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                <Bi en="Teacher sign-up code" id="Kode pendaftaran guru" my="ဆရာ စာရင်းသွင်းကုဒ်" />
              </span>
              <input required type="password" value={form.teacherCode} onChange={set("teacherCode")} className={input} />
              <span className="block text-xs text-muted">A one-time code from the course admin.</span>
            </label>
          )}
          {mode !== "login" && (
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                <Bi en="Your full name" id="Nama lengkapmu" my="သင့်အမည်အပြည့်အစုံ" />
              </span>
              <input required value={form.displayName} onChange={set("displayName")} className={input} />
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">
              <Bi en="Username" id="Nama pengguna" my="အသုံးပြုသူအမည်" />
            </span>
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              value={form.username}
              onChange={set("username")}
              className={input}
            />
            {mode !== "login" && (
              <span className="block text-xs text-muted">
                <Bi
                  en="3–32 English letters or numbers, no spaces (e.g. siti.r or aung23)."
                  id="3–32 huruf atau angka, tanpa spasi (mis. siti.r)."
                  my="အင်္ဂလိပ်စာလုံး သို့မဟုတ် ဂဏန်း ၃–၃၂ လုံး၊ space မပါရ (ဥပမာ aung23)။"
                />
              </span>
            )}
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">
              <Bi en="Password" id="Kata sandi" my="စကားဝှက်" />
            </span>
            <input
              required
              type="password"
              minLength={mode === "login" ? 1 : 6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={set("password")}
              className={input}
            />
            {mode === "student" && (
              <span className="block text-xs text-muted">
                <Bi
                  en="At least 6 characters. If you forget it, your teacher can set a new one."
                  id="Minimal 6 karakter. Jika lupa, gurumu bisa membuat yang baru."
                  my="အနည်းဆုံး စာလုံး ၆ လုံး။ မေ့သွားရင် ဆရာက အသစ် သတ်မှတ်ပေးနိုင်ပါတယ်။"
                />
              </span>
            )}
          </label>
          <ErrorNote message={error} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner label="Please wait…" /> : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-muted">
        <Bi
          en="Your Prompt Lab chats are saved to your account, so you can continue on any device and your teacher can see your progress."
          id="Chat Prompt Lab-mu tersimpan di akunmu, jadi kamu bisa lanjut di perangkat mana saja dan gurumu bisa melihat perkembanganmu."
          my="သင့် Prompt Lab chat များကို အကောင့်ထဲ သိမ်းထားလို့ မည်သည့်စက်မှာမဆို ဆက်လုပ်နိုင်ပြီး ဆရာကလည်း သင့်တိုးတက်မှုကို ကြည့်နိုင်ပါတယ်။"
        />
      </p>
    </div>
  );
}
