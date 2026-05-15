import { describe, expect, it } from "vitest";
import {
  getMimePlayerCountRange,
  getMimeQuestionBounds,
  getMimeRoundPlayerIds,
  isMimeQuestionCompatible,
  isMimeQuestionCompatibleWithRange,
  pickMimePlayerCount,
} from "@/lib/mimeGame";

describe("Mime multi-joueurs", () => {
  it("choisit un nombre de mimeurs dans les bornes du mode et des joueurs presents", () => {
    expect(pickMimePlayerCount("solo", 6, () => 0.9)).toBe(1);
    expect(pickMimePlayerCount("duo", 6, () => 0.2)).toBe(2);
    expect(pickMimePlayerCount("random_1_3", 6, () => 0)).toBe(1);
    expect(pickMimePlayerCount("random_1_3", 6, () => 0.99)).toBe(3);
    expect(pickMimePlayerCount("random_2_4", 2, () => 0.99)).toBe(2);
  });

  it("extrait un groupe circulaire de mimeurs sans depasser l'ordre", () => {
    expect(getMimeRoundPlayerIds(["a", "b", "c", "d"], 1, 3)).toEqual(["b", "c", "d"]);
    expect(getMimeRoundPlayerIds(["a", "b", "c", "d"], 3, 3)).toEqual(["d", "a", "b"]);
    expect(getMimeRoundPlayerIds(["a", "b"], 0, 4)).toEqual(["a", "b"]);
  });

  it("valide la compatibilite des expressions avec un nombre exact ou une plage", () => {
    const duoOnly = { mimePlayerCountMin: 2, mimePlayerCountMax: 2 };
    const teamScene = { mimePlayerCountMin: 3, mimePlayerCountMax: 5 };

    expect(getMimeQuestionBounds(duoOnly)).toEqual({ min: 2, max: 2 });
    expect(isMimeQuestionCompatible(duoOnly, 1)).toBe(false);
    expect(isMimeQuestionCompatible(duoOnly, 2)).toBe(true);
    expect(isMimeQuestionCompatible(teamScene, 4)).toBe(true);
    expect(isMimeQuestionCompatibleWithRange(teamScene, getMimePlayerCountRange("random_1_3", 8))).toBe(true);
    expect(isMimeQuestionCompatibleWithRange(teamScene, getMimePlayerCountRange("duo", 8))).toBe(false);
  });
});
