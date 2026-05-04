import type { Question } from "@/types/database";

export const QUESTIONS: Question[] = [
  { id: 1, optionA: "Être riche mais malheureux", optionB: "Être pauvre mais heureux" },
  { id: 2, optionA: "Pouvoir voler", optionB: "Pouvoir devenir invisible" },
  { id: 3, optionA: "Manger sucré toute sa vie", optionB: "Manger salé toute sa vie" },
  { id: 4, optionA: "Perdre ses souvenirs", optionB: "N'avoir jamais de nouveaux souvenirs" },
  { id: 5, optionA: "Savoir tout mais ne rien pouvoir changer", optionB: "Ne rien savoir mais tout pouvoir changer" },
  { id: 6, optionA: "Vivre 200 ans en bonne santé", optionB: "Revivre sa vie actuelle 3 fois" },
  { id: 7, optionA: "Pouvoir parler toutes les langues", optionB: "Pouvoir jouer de tous les instruments" },
  { id: 8, optionA: "Avoir toujours chaud", optionB: "Avoir toujours froid" },
  { id: 9, optionA: "Ne jamais dormir", optionB: "Dormir 20h par jour" },
  { id: 10, optionA: "Être célèbre mais détesté", optionB: "Être inconnu mais adoré" },
  { id: 11, optionA: "Pouvoir lire dans les pensées", optionB: "Voir le futur" },
  { id: 12, optionA: "Perdre son téléphone", optionB: "Perdre son portefeuille" },
  { id: 13, optionA: "Ne jamais ressentir la douleur", optionB: "Ne jamais ressentir la fatigue" },
  { id: 14, optionA: "Vivre sans musique", optionB: "Vivre sans films/séries" },
  { id: 15, optionA: "Avoir un robot domestique", optionB: "Avoir une voiture volante" },
  { id: 16, optionA: "Manger le même plat chaque jour", optionB: "Ne jamais remanger le même plat" },
  { id: 17, optionA: "Connaître l'heure de sa mort", optionB: "Connaître la cause de sa mort" },
  { id: 18, optionA: "Avoir un super pouvoir inutile", optionB: "N'avoir aucun super pouvoir" },
  { id: 19, optionA: "Voyager dans le passé sans pouvoir changer", optionB: "Voyager dans le futur sans pouvoir revenir" },
  { id: 20, optionA: "Être le plus intelligent du monde", optionB: "Être le plus charismatique du monde" },
  { id: 21, optionA: "Avoir une mémoire parfaite", optionB: "Pouvoir oublier ce que tu veux" },
  { id: 22, optionA: "Perdre le goût", optionB: "Perdre l'odorat" },
  { id: 23, optionA: "Parler en rimes tout le temps", optionB: "Chanter au lieu de parler" },
  { id: 24, optionA: "N'avoir qu'1 ami très proche", optionB: "Avoir 1000 amis superficiels" },
  { id: 25, optionA: "Être toujours en avance", optionB: "Être toujours en retard" },
];

export function getQuestion(id: number | null | undefined): Question | undefined {
  if (id == null) return undefined;
  return QUESTIONS.find((q) => q.id === id);
}
