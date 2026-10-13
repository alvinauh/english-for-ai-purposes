"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearStored, getJSON, KEYS, postJSON } from "@/lib/store";

export interface SessionUser {
  id: string;
  role: "student" | "teacher";
  username: string;
  displayName: string;
  classId: string | null;
  className: string | null;
  isAdmin: boolean;
}

interface AuthState {
  user: SessionUser | null;
  /** True until the first /api/auth/me reply. */
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getJSON<{ user: SessionUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await postJSON("/api/auth/logout", {}).catch(() => {});
    // Remove this user's cached chats so the next person on a shared computer cannot see them.
    if (user) clearStored(KEYS.labChatsFor(user.id));
    clearStored(KEYS.labCurrent);
    setUser(null);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the session once on mount
    refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  if (loading) return null;
  if (!user) {
    return (
      <Link href="/login" className="rounded-md border border-line bg-surface px-3 py-1 text-sm font-medium hover:bg-subtle">
        Log in
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      {user.isAdmin && (
        <Link href="/admin" className="font-medium text-accent hover:underline">
          Admin
        </Link>
      )}
      {user.role === "teacher" && (
        <Link href="/teacher" className="font-medium text-accent hover:underline">
          Teacher dashboard
        </Link>
      )}
      <span className="text-muted" title={`@${user.username}`}>
        {user.displayName}
      </span>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="rounded-md border border-line bg-surface px-2 py-1 hover:bg-subtle"
      >
        Log out
      </button>
    </span>
  );
}
