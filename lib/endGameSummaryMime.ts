import type { GameType, MimeGameState, Player } from "@/types/database";
import { getQuestionForGame } from "./gameQuestions";
import type { SummaryRareMoment, SummarySpotlight } from "./endGameSummaryTypes";
import { maxPlayer } from "./endGameSummaryUtils";

export function buildMimeSpotlights(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): SummarySpotlight[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const history = state?.mimeHistory ?? [];
  const firstRecord = history[0];
  const lastRecord = history[history.length - 1];
  const firstMime = firstRecord ? playerById.get(firstRecord.mimePlayerId) ?? null : null;
  const lastMime = lastRecord ? playerById.get(lastRecord.mimePlayerId) ?? null : null;
  const mostOnStage = maxPlayer(players, mimeCounts);
  const waiting = players.find((player) => (mimeCounts.get(player.id) ?? 0) === 0) ?? null;
  const nextPlayer = getNextMimePlayer(players, state);
  const lastExpression = lastRecord ? getQuestionText("mime_expressions", lastRecord.expressionId) : null;

  return [
    {
      id: "mime-opener",
      label: "Ouverture de scène",
      title: firstMime ? "Premier mime" : "Rideau fermé",
      player: firstMime,
      value: firstMime ? "#1" : "0",
      detail: firstMime
        ? `${firstMime.name} a lancé le show${lastExpression && history.length === 1 ? ` avec "${lastExpression}"` : ""}.`
        : "Aucun passage au mime enregistré.",
      tone: "gold",
    },
    {
      id: "mime-last",
      label: "Dernière expression",
      title: lastExpression ?? "Expression gardée secrète",
      player: lastMime,
      value: history.length ? `${history.length}` : "0",
      detail: lastMime
        ? `${lastMime.name} était sur scène pour la dernière manche jouée.`
        : "La partie n'a pas encore laissé de dernière scène.",
      tone: "cyan",
    },
    {
      id: "mime-spotlight",
      label: "Le plus exposé",
      title: mostOnStage?.player ? "Aimant à spotlight" : "Spotlight disponible",
      player: mostOnStage?.player ?? null,
      value: mostOnStage?.player ? `${mostOnStage.value}` : "0",
      detail: mostOnStage?.player
        ? `${mostOnStage.player.name} a pris la lumière ${mostOnStage.value} fois.`
        : "Personne n'a encore vraiment monopolisé la scène.",
      tone: "pink",
    },
    {
      id: "mime-next",
      label: "Dans la file",
      title: nextPlayer ? "Prochain à surveiller" : "File vide",
      player: nextPlayer,
      value: nextPlayer && state ? `#${Math.max(1, state.playerOrder.indexOf(nextPlayer.id) + 1)}` : "-",
      detail: nextPlayer
        ? `${nextPlayer.name} attend son passage dans l'ordre automatique.`
        : "Aucun prochain joueur détecté dans l'ordre.",
      tone: "purple",
    },
    {
      id: "mime-waiting",
      label: "Encore en coulisses",
      title: waiting ? "Pas encore passé" : "Tout le monde a joué",
      player: waiting,
      value: waiting ? "0" : "OK",
      detail: waiting
        ? `${waiting.name} n'a pas encore eu son moment de mime.`
        : "La rotation a déjà donné une scène à tout le monde.",
      tone: waiting ? "ghost" : "green",
    },
    {
      id: "mime-host-mode",
      label: "Mode hôte",
      title: state?.hostPlayMode ? "Hôte joueur activé" : "Hôte régisseur",
      player: null,
      value: state?.hostPlayMode ? "ON" : "OFF",
      detail: state?.hostPlayMode
        ? "L'hôte ne voit l'expression que quand c'est son tour de mimer."
        : "L'hôte garde la vision complète pour animer la partie.",
      tone: state?.hostPlayMode ? "green" : "cyan",
    },
  ];
}

export function buildMimeInsights(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): string[] {
  if (!state || state.mimeHistory.length === 0) {
    return ["Le rideau n'a presque pas eu le temps de s'ouvrir."];
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const firstRecord = state.mimeHistory[0];
  const lastRecord = state.mimeHistory[state.mimeHistory.length - 1];
  const first = playerById.get(firstRecord.mimePlayerId);
  const last = playerById.get(lastRecord.mimePlayerId);
  const next = getNextMimePlayer(players, state);
  const waiting = players.filter((player) => (mimeCounts.get(player.id) ?? 0) === 0);
  const lastExpression = getQuestionText("mime_expressions", lastRecord.expressionId);

  const lines: string[] = [];
  if (first) lines.push(`${first.name} a ouvert la scène, donc tout le monde peut le remercier ou lui en vouloir.`);
  if (last && lastExpression) lines.push(`Dernier dossier mimé : "${lastExpression}" par ${last.name}.`);
  if (next) lines.push(`Le relais automatique pointe maintenant vers ${next.name}.`);
  if (waiting.length) {
    lines.push(`${waiting.map((player) => player.name).join(", ")} attend${waiting.length > 1 ? "ent" : ""} encore le spotlight.`);
  } else {
    lines.push("La rotation a déjà fait passer toute la table.");
  }

  return lines.slice(0, 4);
}

export function buildMimeRareMoments(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): SummaryRareMoment[] {
  const moments: SummaryRareMoment[] = [];
  const history = state?.mimeHistory ?? [];
  if (!state || history.length === 0) return moments;

  if (history.length === 1) {
    moments.push({
      title: "Premier rideau levé",
      detail: "Une seule manche, donc le bilan garde surtout la trace du lancement du show.",
      tone: "cyan",
    });
  }

  const everyonePassed = players.length > 0 && players.every((player) => (mimeCounts.get(player.id) ?? 0) > 0);
  if (everyonePassed) {
    moments.push({
      title: "Tour complet",
      detail: "Chaque joueur a eu son passage au mime. Rotation propre.",
      tone: "gold",
    });
  }

  const repeat = maxPlayer(players, mimeCounts);
  if (repeat && repeat.value >= 2) {
    moments.push({
      title: "Rappel sur scène",
      detail: `${repeat.player.name} est passé ${repeat.value} fois au mime.`,
      tone: "pink",
    });
  }

  if (state.hostPlayMode) {
    moments.push({
      title: "Hôte dans l'arène",
      detail: "Le mode hôte joueur était activé : pas de spoiler permanent pour l'hôte.",
      tone: "green",
    });
  }

  return moments.slice(0, 5);
}

function getNextMimePlayer(players: Player[], state: MimeGameState | null): Player | null {
  if (!state || state.playerOrder.length === 0) return null;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const nextIndex = (state.currentMimeIndex + 1) % state.playerOrder.length;
  return playerById.get(state.playerOrder[nextIndex]) ?? null;
}

function getQuestionText(gameType: GameType, questionId: number): string | null {
  const question = getQuestionForGame(gameType, questionId);
  if (!question) return null;
  if ("text" in question && question.text) return question.text;
  if ("optionA" in question && "optionB" in question) return `${question.optionA} / ${question.optionB}`;
  return null;
}
