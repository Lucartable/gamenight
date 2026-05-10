import { CATEGORIES, QUESTIONS } from "../lib/questions";
import { WHO_OF_US_CATEGORIES, WHO_OF_US_QUESTIONS } from "../lib/whoOfUsQuestions";
import { MAJORITY_CATEGORIES, MAJORITY_QUESTIONS } from "../lib/majorityQuestions";
import { JAUGE_CATEGORIES, JAUGE_QUESTIONS } from "../lib/jaugeQuestions";
import { MIME_EXPRESSION_CATEGORIES, MIME_EXPRESSIONS } from "../lib/mimeExpressions";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
}

function countByCategory<T extends { category: string }>(items: T[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return counts;
}

function findDups<T>(name: string, items: T[], getKey: (item: T) => string) {
  const seen = new Map<string, T>();
  const dups: { key: string; a: T; b: T }[] = [];
  for (const item of items) {
    const key = normalize(getKey(item));
    const prev = seen.get(key);
    if (prev) dups.push({ key, a: prev, b: item });
    else seen.set(key, item);
  }
  console.log(`${name}: total=${items.length} dups=${dups.length}`);
  for (const d of dups) console.log("  -", d.key);
}

findDups("who_would", QUESTIONS, (q) => `${q.optionA} | ${q.optionB}`);
findDups("who_of_us", WHO_OF_US_QUESTIONS, (q) => q.text);
findDups("majority", MAJORITY_QUESTIONS, (q) => q.text);
findDups("jauge", JAUGE_QUESTIONS, (q) => q.text);
findDups("mime", MIME_EXPRESSIONS, (q) => q.text);

console.log("\nCategories:");
console.log("  who_would:", CATEGORIES.length);
console.log("  who_of_us:", WHO_OF_US_CATEGORIES.length);
console.log("  majority:", MAJORITY_CATEGORIES.length);
console.log("  jauge:", JAUGE_CATEGORIES.length);
console.log("  mime:", MIME_EXPRESSION_CATEGORIES.length);

function dump(name: string, counts: Map<string, number>) {
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n${name} per category:`);
  for (const [cat, n] of entries) console.log(`  ${cat.padEnd(16)} ${n}`);
}

dump("who_would", countByCategory(QUESTIONS));
dump("who_of_us", countByCategory(WHO_OF_US_QUESTIONS));
dump("majority", countByCategory(MAJORITY_QUESTIONS));
dump("jauge", countByCategory(JAUGE_QUESTIONS));
dump("mime", countByCategory(MIME_EXPRESSIONS));

const total = QUESTIONS.length + WHO_OF_US_QUESTIONS.length + MAJORITY_QUESTIONS.length + JAUGE_QUESTIONS.length + MIME_EXPRESSIONS.length;
console.log(`\nGRAND TOTAL: ${total} questions/mimes`);
