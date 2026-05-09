import { describe, expect, it } from "vitest";
import { CATEGORIES, QUESTIONS } from "@/lib/questions";
import { WHO_OF_US_CATEGORIES, WHO_OF_US_QUESTIONS } from "@/lib/whoOfUsQuestions";
import { MAJORITY_CATEGORIES, MAJORITY_QUESTIONS } from "@/lib/majorityQuestions";
import { JAUGE_CATEGORIES, JAUGE_QUESTIONS } from "@/lib/jaugeQuestions";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
}

describe("question content invariants", () => {
  it("who_would: ids uniques, options non vides, catégories valides", () => {
    const ids = new Set<number>();
    const normalized = new Set<string>();
    const validCategories = new Set(CATEGORIES.map((c) => c.id));
    for (const question of QUESTIONS) {
      expect(ids.has(question.id), `duplicate id ${question.id}`).toBe(false);
      ids.add(question.id);
      expect(question.optionA.trim().length).toBeGreaterThan(0);
      expect(question.optionB.trim().length).toBeGreaterThan(0);
      expect(question.optionA.trim()).not.toBe(question.optionB.trim());
      expect(validCategories.has(question.category)).toBe(true);
      const fingerprint = `${normalize(question.optionA)} | ${normalize(question.optionB)}`;
      expect(normalized.has(fingerprint), `duplicate question fingerprint: ${fingerprint}`).toBe(false);
      normalized.add(fingerprint);
    }
    // Volume sanity check : on s'assure d'avoir > 500 questions au total.
    expect(QUESTIONS.length).toBeGreaterThan(500);
  });

  it("who_of_us: ids uniques, texte non vide, catégorie valide, pas de doublon textuel", () => {
    const ids = new Set<number>();
    const normalized = new Set<string>();
    const validCategories = new Set(WHO_OF_US_CATEGORIES.map((c) => c.id));
    for (const question of WHO_OF_US_QUESTIONS) {
      expect(ids.has(question.id), `duplicate id ${question.id}`).toBe(false);
      ids.add(question.id);
      expect(question.text.trim().length).toBeGreaterThan(8);
      expect(validCategories.has(question.category)).toBe(true);
      const fingerprint = normalize(question.text);
      expect(normalized.has(fingerprint), `duplicate text: ${question.text}`).toBe(false);
      normalized.add(fingerprint);
    }
    expect(WHO_OF_US_QUESTIONS.length).toBeGreaterThan(500);
  });

  it("majority: ids uniques, options ≥ 2, catégorie valide, options distinctes", () => {
    const ids = new Set<number>();
    const normalized = new Set<string>();
    const validCategories = new Set(MAJORITY_CATEGORIES.map((c) => c.id));
    for (const question of MAJORITY_QUESTIONS) {
      expect(ids.has(question.id), `duplicate id ${question.id}`).toBe(false);
      ids.add(question.id);
      expect(question.text.trim().length).toBeGreaterThan(0);
      expect(validCategories.has(question.category)).toBe(true);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      const opts = new Set(question.options.map((o) => normalize(o)));
      expect(opts.size, `options doublons sur "${question.text}"`).toBe(question.options.length);
      const fingerprint = normalize(question.text);
      expect(normalized.has(fingerprint), `duplicate text: ${question.text}`).toBe(false);
      normalized.add(fingerprint);
    }
    expect(MAJORITY_QUESTIONS.length).toBeGreaterThan(200);
  });

  it("jauge: ids uniques, texte non vide, catégorie valide, format À quel point", () => {
    const ids = new Set<number>();
    const normalized = new Set<string>();
    const validCategories = new Set(JAUGE_CATEGORIES.map((c) => c.id));
    for (const question of JAUGE_QUESTIONS) {
      expect(ids.has(question.id), `duplicate id ${question.id}`).toBe(false);
      ids.add(question.id);
      expect(question.text.trim().length).toBeGreaterThan(8);
      expect(validCategories.has(question.category)).toBe(true);
      expect(question.text.toLowerCase()).toContain("à quel point");
      const fingerprint = normalize(question.text);
      expect(normalized.has(fingerprint), `duplicate text: ${question.text}`).toBe(false);
      normalized.add(fingerprint);
    }
    expect(JAUGE_QUESTIONS.length).toBeGreaterThan(450);
  });
});
