import type { AskedQuestion, JaugeGameState, Player, Rating } from "@/types/database";
import { getSectionLabels } from "./endGameSummaryLabels";
import type { EndGameSummary, SummaryHeatCell, SummaryRareMoment, SummaryScoreRow, SummarySpotlight } from "./endGameSummaryTypes";
import { average, formatRating, unique } from "./endGameSummaryUtils";

interface JaugePlayerStats {
  player: Player;
  received: Rating[];
  given: Rating[];
  averageReceived: number;
  averageGiven: number;
  spreadReceived: number;
  extremeGiven: number;
}

export function buildJaugeSummary({
  players,
  ratings,
  askedForGame,
  roundQuestionIds,
  jaugeGameState,
}: {
  players: Player[];
  ratings: Rating[];
  askedForGame: AskedQuestion[];
  roundQuestionIds: number[];
  jaugeGameState: JaugeGameState | null;
}): EndGameSummary {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const visibleRatings = ratings.filter((rating) => playerById.has(rating.voter_player_id) && playerById.has(rating.target_player_id));
  const roundIds = unique([...roundQuestionIds, ...visibleRatings.map((rating) => rating.question_id)].filter((id) => Number.isFinite(id) && id !== 0));
  const roundsPlayed = Math.max(roundIds.length, askedForGame.length, jaugeGameState?.roundNumber ?? 0);
  const stats = players.map((player) => buildJaugePlayerStats(player, visibleRatings));
  const rankedTargets = stats
    .filter((row) => row.received.length > 0)
    .sort((a, b) => b.averageReceived - a.averageReceived || b.received.length - a.received.length || a.player.name.localeCompare(b.player.name));
  const leaderStats = rankedTargets[0] ?? null;
  const scoreboard: SummaryScoreRow[] = rankedTargets.map((row, index) => ({
    player: row.player,
    rank: index + 1,
    score: Math.round(row.averageReceived * 10),
    scoreLabel: "/100",
    detail: `${formatRating(row.averageReceived)}/10 sur ${row.received.length} note${row.received.length > 1 ? "s" : ""}`,
    tone: index === 0 ? "gold" : index === 1 ? "cyan" : index === 2 ? "pink" : "purple",
  }));
  const leader = scoreboard[0] ?? null;
  const mostControversial = [...stats]
    .filter((row) => row.received.length > 1)
    .sort((a, b) => b.spreadReceived - a.spreadReceived || b.received.length - a.received.length)[0] ?? null;
  const generous = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => b.averageGiven - a.averageGiven || b.given.length - a.given.length)[0] ?? null;
  const severe = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => a.averageGiven - b.averageGiven || b.given.length - a.given.length)[0] ?? null;
  const extreme = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => b.extremeGiven - a.extremeGiven || b.given.length - a.given.length)[0] ?? null;
  const invisible = [...stats]
    .sort((a, b) => a.received.length - b.received.length || a.averageReceived - b.averageReceived || a.player.name.localeCompare(b.player.name))[0] ?? null;
  const underrated = rankedTargets[rankedTargets.length - 1] ?? null;
  const heatmap = buildJaugeHeatmap(players, visibleRatings);
  const canRevealAuthors = jaugeGameState?.anonymityMode !== "anonymous";
  const relationInsights = canRevealAuthors
    ? buildJaugeRelationInsights(heatmap, generous, severe)
    : ["Anonymat permanent activé : les relations de notes restent enterrées."];
  const rareMoments = buildJaugeRareMoments(players, visibleRatings, rankedTargets, mostControversial);
  const buildVoterSpotlight = (
    base: Omit<SummarySpotlight, "player" | "detail"> & { detail: string },
    voter: JaugePlayerStats | null,
    fallbackDetail: string
  ): SummarySpotlight => {
    if (!voter) return { ...base, player: null };
    if (!canRevealAuthors) {
      return {
        ...base,
        player: null,
        detail: fallbackDetail,
      };
    }
    return { ...base, player: voter.player };
  };
  const spotlights: SummarySpotlight[] = [
    {
      id: "best-average",
      label: "Meilleure moyenne",
      title: leaderStats ? "Réputation validée" : "Pas encore noté",
      player: leaderStats?.player ?? null,
      value: leaderStats ? `${formatRating(leaderStats.averageReceived)}/10` : "0",
      detail: leaderStats
        ? `${leaderStats.player.name} sort avec la meilleure jauge du groupe.`
        : "Aucune note exploitable pour départager la table.",
      tone: "gold",
    },
    {
      id: "controversial-rating",
      label: "Le plus controversé",
      title: mostControversial ? "Table coupée en deux" : "Avis plutôt sages",
      player: mostControversial?.player ?? null,
      value: mostControversial ? `${mostControversial.spreadReceived}` : "0",
      detail: mostControversial
        ? `${mostControversial.player.name} a déclenché l'écart de notes le plus violent.`
        : "Pas assez d'écarts pour créer un vrai débat.",
      tone: mostControversial && mostControversial.spreadReceived >= 6 ? "danger" : "pink",
    },
    buildVoterSpotlight(
      {
        id: "generous",
        label: "Juge généreux",
        title: generous ? "Distribue les 10" : "Personne ne valide",
        value: generous ? `${formatRating(generous.averageGiven)}` : "0",
        detail: generous
          ? `${generous.player.name} donne en moyenne ${formatRating(generous.averageGiven)}/10.`
          : "Aucune note donnée.",
        tone: "green",
      },
      generous,
      generous ? `Un juge anonyme distribue ${formatRating(generous.averageGiven)}/10 en moyenne.` : "Aucune note donnée."
    ),
    buildVoterSpotlight(
      {
        id: "severe",
        label: "Juge sévère",
        title: severe ? "Correcteur impitoyable" : "Aucune sévérité",
        value: severe ? `${formatRating(severe.averageGiven)}` : "0",
        detail: severe
          ? `${severe.player.name} note en moyenne ${formatRating(severe.averageGiven)}/10.`
          : "Aucune note donnée.",
        tone: "cyan",
      },
      severe,
      severe ? `Un juge anonyme garde la moyenne la plus froide à ${formatRating(severe.averageGiven)}/10.` : "Aucune note donnée."
    ),
    buildVoterSpotlight(
      {
        id: "extreme",
        label: "Notes extrêmes",
        title: extreme ? "Zéro nuance" : "Tout est tiède",
        value: extreme ? `${formatRating(extreme.extremeGiven)}` : "0",
        detail: extreme
          ? `${extreme.player.name} s'éloigne le plus du centre de la jauge.`
          : "Pas assez de notes pour mesurer les extrêmes.",
        tone: "purple",
      },
      extreme,
      "Quelqu'un d'anonyme tire les notes loin du centre."
    ),
    {
      id: "low-average",
      label: "Le plus détruit",
      title: underrated ? "La table n'a pas cru au dossier" : "Personne au sol",
      player: underrated?.player ?? null,
      value: underrated ? `${formatRating(underrated.averageReceived)}/10` : "0",
      detail: underrated
        ? `${underrated.player.name} reçoit la moyenne la plus basse de la soirée.`
        : "Aucune moyenne basse détectée.",
      tone: underrated && underrated.averageReceived <= 3.5 ? "danger" : "ghost",
    },
    {
      id: "invisible-rating",
      label: "Peu évalué",
      title: invisible && invisible.received.length === 0 ? "Hors radar" : "Présence discrète",
      player: invisible?.player ?? null,
      value: invisible ? `${invisible.received.length}` : "0",
      detail: invisible
        ? `${invisible.player.name} a reçu le moins de passages à la jauge.`
        : "Tout le monde a été évalué.",
      tone: "ghost",
    },
  ];

  return {
    profile: "rating",
    title: leaderStats ? `${leaderStats.player.name} explose la jauge` : "La jauge attend son verdict",
    subtitle: `Jauge · ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""} · ${visibleRatings.length} note${visibleRatings.length > 1 ? "s" : ""} analysée${visibleRatings.length > 1 ? "s" : ""}`,
    leaderLabel: "Réputation du soir",
    sectionLabels: getSectionLabels("rating"),
    roundsPlayed,
    totalVotes: visibleRatings.length,
    leader,
    scoreboard,
    spotlights,
    heatmapMode: canRevealAuthors ? "targets" : "empty",
    heatmap: canRevealAuthors ? heatmap : [],
    relationInsights,
    rareMoments,
    recapLines: buildJaugeRecapLines(leaderStats, mostControversial, generous, severe, relationInsights, rareMoments, canRevealAuthors),
  };
}

function buildJaugePlayerStats(player: Player, ratings: Rating[]): JaugePlayerStats {
  const received = ratings.filter((rating) => rating.target_player_id === player.id);
  const given = ratings.filter((rating) => rating.voter_player_id === player.id);
  const receivedValues = received.map((rating) => rating.rating);
  const givenValues = given.map((rating) => rating.rating);
  return {
    player,
    received,
    given,
    averageReceived: average(receivedValues),
    averageGiven: average(givenValues),
    spreadReceived: receivedValues.length > 1 ? Math.max(...receivedValues) - Math.min(...receivedValues) : 0,
    extremeGiven: givenValues.length ? average(givenValues.map((value) => Math.abs(value - 5.5))) : 0,
  };
}

function buildJaugeHeatmap(players: Player[], ratings: Rating[]): SummaryHeatCell[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const grouped = new Map<string, Rating[]>();
  for (const rating of ratings) {
    if (rating.voter_player_id === rating.target_player_id) continue;
    const key = `${rating.voter_player_id}:${rating.target_player_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), rating]);
  }
  return [...grouped.entries()]
    .map(([key, rows]): SummaryHeatCell | null => {
      const [fromId, toId] = key.split(":");
      const from = playerById.get(fromId);
      const to = playerById.get(toId);
      if (!from || !to) return null;
      const avg = average(rows.map((row) => row.rating));
      return {
        from,
        to,
        value: rows.length,
        percent: Math.round(avg * 10),
        metricLabel: `${formatRating(avg)}/10`,
        detail: `${rows.length} note${rows.length > 1 ? "s" : ""}, moyenne ${formatRating(avg)}/10`,
      };
    })
    .filter((cell): cell is SummaryHeatCell => Boolean(cell))
    .sort((a, b) => b.value - a.value || a.percent - b.percent)
    .slice(0, 12);
}

function buildJaugeRelationInsights(
  heatmap: SummaryHeatCell[],
  generous: JaugePlayerStats | null,
  severe: JaugePlayerStats | null
): string[] {
  const harsh = [...heatmap].sort((a, b) => a.percent - b.percent || b.value - a.value)[0];
  const hype = [...heatmap].sort((a, b) => b.percent - a.percent || b.value - a.value)[0];
  const asymmetry = findJaugeAsymmetry(heatmap);
  return [
    harsh ? `${harsh.from.name} est le plus dur avec ${harsh.to.name} : ${harsh.metricLabel}.` : "Aucune sévérité ciblée détectée.",
    hype ? `${hype.from.name} valide fortement ${hype.to.name} : ${hype.metricLabel}.` : "Aucun boost évident entre deux joueurs.",
    asymmetry ?? "Pas de relation asymétrique nette sur cette partie.",
    generous ? `${generous.player.name} a la main la plus généreuse de la table.` : "Aucun juge généreux mesurable.",
    severe ? `${severe.player.name} garde les notes les plus froides.` : "Aucun juge vraiment sévère.",
  ];
}

function findJaugeAsymmetry(heatmap: SummaryHeatCell[]): string | null {
  const byPair = new Map(heatmap.map((cell) => [`${cell.from.id}:${cell.to.id}`, cell]));
  let best: { a: SummaryHeatCell; b: SummaryHeatCell; gap: number } | null = null;
  for (const cell of heatmap) {
    const reverse = byPair.get(`${cell.to.id}:${cell.from.id}`);
    if (!reverse) continue;
    const gap = Math.abs(cell.percent - reverse.percent);
    if (!best || gap > best.gap) best = { a: cell, b: reverse, gap };
  }
  if (!best || best.gap < 30) return null;
  const high = best.a.percent >= best.b.percent ? best.a : best.b;
  const low = high === best.a ? best.b : best.a;
  return `${high.from.name} note ${high.to.name} bien plus haut que l'inverse : ${high.metricLabel} contre ${low.metricLabel}.`;
}

function buildJaugeRareMoments(
  players: Player[],
  ratings: Rating[],
  rankedTargets: JaugePlayerStats[],
  controversial: JaugePlayerStats | null
): SummaryRareMoment[] {
  const perfectTens = ratings.filter((rating) => rating.rating === 10).length;
  const brutalLows = rankedTargets.filter((row) => row.averageReceived > 0 && row.averageReceived <= 3).length;
  const perfectPlayer = rankedTargets.find((row) => row.averageReceived >= 9.5 && row.received.length >= Math.max(1, Math.floor(players.length / 2)));
  const moments: SummaryRareMoment[] = [];
  if (perfectPlayer) {
    moments.push({
      title: "Réputation dorée",
      detail: `${perfectPlayer.player.name} finit presque au plafond avec ${formatRating(perfectPlayer.averageReceived)}/10.`,
      tone: "gold",
    });
  }
  if (perfectTens > 0) {
    moments.push({
      title: "Pluie de 10",
      detail: `${perfectTens} note${perfectTens > 1 ? "s" : ""} maximale${perfectTens > 1 ? "s" : ""} envoyée${perfectTens > 1 ? "s" : ""}.`,
      tone: "green",
    });
  }
  if (controversial && controversial.spreadReceived >= 6) {
    moments.push({
      title: "Écart maximal",
      detail: `${controversial.player.name} déclenche un écart de ${controversial.spreadReceived} points.`,
      tone: "danger",
    });
  }
  if (brutalLows > 0) {
    moments.push({
      title: "Jugement brutal",
      detail: `${brutalLows} moyenne${brutalLows > 1 ? "s" : ""} sous 3/10. La table n'a pas tremblé.`,
      tone: "pink",
    });
  }
  return moments;
}

function buildJaugeRecapLines(
  leader: JaugePlayerStats | null,
  controversial: JaugePlayerStats | null,
  generous: JaugePlayerStats | null,
  severe: JaugePlayerStats | null,
  relationInsights: string[],
  rareMoments: SummaryRareMoment[],
  canRevealAuthors: boolean
): string[] {
  const stylesLine = canRevealAuthors
    ? generous && severe && generous.player.id !== severe.player.id
      ? `${generous.player.name} donne haut, ${severe.player.name} note froid.`
      : "Les styles de notation restent assez proches."
    : "Les styles de notation restent anonymes : pas de juge identifié.";
  return [
    leader ? `${leader.player.name} finit avec la meilleure moyenne : ${formatRating(leader.averageReceived)}/10.` : "Pas assez de notes pour désigner une meilleure moyenne.",
    controversial ? `${controversial.player.name} a le plus divisé la table.` : "La table a noté sans énorme fracture.",
    stylesLine,
    relationInsights[0] ?? "Aucune relation de notes assez nette.",
    rareMoments[0]?.detail ?? "Aucun moment rare, mais la réputation de chacun a bougé.",
  ];
}
