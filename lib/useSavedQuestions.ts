"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameType, SavedCustomQuestion } from "@/types/database";
import { getSupabase } from "./supabase";
import { SAVED_CUSTOM_QUESTION_SELECT, logSupabasePayload } from "./supabasePayload";

export function useSavedQuestions(gameType: GameType | null | undefined, enabled: boolean) {
  const [questions, setQuestions] = useState<SavedCustomQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      let query = getSupabase()
        .from("saved_custom_questions")
        .select(SAVED_CUSTOM_QUESTION_SELECT)
        .order("created_at", { ascending: false });
      if (gameType) query = query.eq("game_type", gameType);
      const { data } = await query;
      logSupabasePayload("useSavedQuestions.saved_custom_questions", data);
      setQuestions((data as SavedCustomQuestion[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [enabled, gameType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(() => ({ savedQuestions: questions, loading, refresh }), [loading, questions, refresh]);
}
