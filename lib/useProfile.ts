"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Profile, UserRole } from "@/types/database";
import { getSupabase } from "./supabase";

interface UseProfileState {
  userId: string | null;
  profile: Profile | null;
  role: UserRole;
  canManageQuestions: boolean;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileState {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const nextUserId = userData.user?.id ?? null;
    setUserId(nextUserId);
    if (!nextUserId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", nextUserId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const role = profile?.role ?? "player";
  const canManageQuestions = role === "trusted" || role === "admin";

  const signInWithEmail = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return "Entre un email.";
    const { error } = await getSupabase().auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined },
    });
    return error?.message ?? null;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return "Entre un email.";
    if (!password) return "Entre ton mot de passe.";
    const { error } = await getSupabase().auth.signInWithPassword({ email: clean, password });
    if (!error) await refresh();
    return error?.message ?? null;
  }, [refresh]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUserId(null);
    setProfile(null);
  }, []);

  return useMemo(
    () => ({ userId, profile, role, canManageQuestions, loading, signInWithEmail, signInWithPassword, signOut, refresh }),
    [canManageQuestions, loading, profile, refresh, role, signInWithEmail, signInWithPassword, signOut, userId]
  );
}
