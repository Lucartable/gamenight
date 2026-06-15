"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import type { GameType, QuestionPack, QuestionPackItem, SavedCustomQuestion } from "@/types/database";
import { QUESTION_PACK_ITEM_SELECT, QUESTION_PACK_SELECT, logSupabasePayload } from "./supabasePayload";

export interface PackQuestionIndexItem {
  id: string;
  game_type: GameType;
}

export function useQuestionPacks(enabled: boolean) {
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [packItems, setPackItems] = useState<QuestionPackItem[]>([]);
  const [questionIndex, setQuestionIndex] = useState<PackQuestionIndexItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPacks([]);
      setPackItems([]);
      setQuestionIndex([]);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const [packsResult, itemsResult, questionsResult] = await Promise.all([
        supabase.from("question_packs").select(QUESTION_PACK_SELECT).order("created_at", { ascending: false }),
        supabase.from("question_pack_items").select(QUESTION_PACK_ITEM_SELECT),
        supabase.from("saved_custom_questions").select("id, game_type"),
      ]);

      logSupabasePayload("useQuestionPacks.question_packs", packsResult.data);
      logSupabasePayload("useQuestionPacks.question_pack_items", itemsResult.data);
      logSupabasePayload("useQuestionPacks.saved_question_index", questionsResult.data);
      setPacks((packsResult.data as QuestionPack[] | null) ?? []);
      setPackItems((itemsResult.data as QuestionPackItem[] | null) ?? []);
      setQuestionIndex((questionsResult.data as PackQuestionIndexItem[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ packs, packItems, questionIndex, loading, refresh }),
    [loading, packItems, packs, questionIndex, refresh],
  );
}

export function getSelectedPackQuestions({
  selectedPackIds,
  packItems,
  savedQuestions,
}: {
  selectedPackIds: string[];
  packItems: QuestionPackItem[];
  savedQuestions: SavedCustomQuestion[];
}): SavedCustomQuestion[] {
  if (!selectedPackIds.length) return [];
  const selected = new Set(selectedPackIds);
  const questionIds = new Set(
    packItems
      .filter((item) => selected.has(item.pack_id))
      .map((item) => item.saved_question_id),
  );
  return savedQuestions.filter((question) => questionIds.has(question.id));
}
