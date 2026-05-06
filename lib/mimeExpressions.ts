// Expressions importees depuis "Expression gamenight.rtf".

export type MimeExpressionCategory = "classique" | "apero_18";

export interface MimeExpressionCategoryMeta {
  id: MimeExpressionCategory;
  label: string;
  emoji: string;
  description: string;
  adult: boolean;
}

export interface MimeExpression {
  id: number;
  category: MimeExpressionCategory;
  text: string;
}

export const MIME_EXPRESSION_CATEGORIES: MimeExpressionCategoryMeta[] = [
  {
    id: "classique",
    label: "Classique",
    emoji: "🎭",
    adult: false,
    description: "Expressions et proverbes français connus, faciles à lancer.",
  },
  {
    id: "apero_18",
    label: "Apéro +18",
    emoji: "🍻",
    adult: true,
    description: "Version beauf, trash et familière pour groupes adultes.",
  },
];

const CLASSIC_EXPRESSIONS = lines(`
Tomber dans les pommes
Donner sa langue au chat
Avoir la tête dans les nuages
Mettre les pieds dans le plat
Avoir le cœur sur la main
Poser un lapin
Avoir un chat dans la gorge
Tourner autour du pot
Passer du coq à l’âne
Avoir le bras long
Avoir les yeux plus gros que le ventre
Être dans la lune
Avoir un poil dans la main
Casser les pieds
Marcher sur des œufs
Jeter l’éponge
Mettre la main à la pâte
Avoir la pêche
Avoir la banane
Raconter des salades
Prendre ses jambes à son cou
Courir deux lièvres à la fois
Se serrer la ceinture
Avoir du pain sur la planche
Être au bout du rouleau
Mettre la charrue avant les bœufs
Chercher midi à quatorze heures
Se mettre le doigt dans l’œil
Avoir la chair de poule
Être rouge comme une tomate
Être blanc comme un linge
Être muet comme une carpe
Dormir comme une marmotte
Manger comme quatre
Boire comme un trou
Pleurer comme une madeleine
Être malin comme un singe
Être têtu comme une mule
Être fort comme un bœuf
Être fier comme un coq
Être doux comme un agneau
Être rapide comme l’éclair
Être lent comme une tortue
Être rusé comme un renard
Être bavard comme une pie
Être myope comme une taupe
Être sourd comme un pot
Être sage comme une image
Être haut comme trois pommes
Être serrés comme des sardines
Prendre le taureau par les cornes
Mettre de l’eau dans son vin
Avoir plusieurs cordes à son arc
Tirer les vers du nez
Couper les cheveux en quatre
Avoir une araignée au plafond
Avoir le cafard
Avoir la puce à l’oreille
Avoir une faim de loup
Avoir une mémoire d’éléphant
Avoir une langue de vipère
Avoir des fourmis dans les jambes
Avoir le pied marin
Avoir la main verte
Avoir la grosse tête
Avoir le melon
Avoir la main lourde
Avoir la main légère
Avoir bon dos
Avoir le nez creux
Avoir les dents longues
Avoir les oreilles qui sifflent
Avoir le dos au mur
Avoir le couteau sous la gorge
Avoir le feu aux fesses
Avoir un coup de foudre
Avoir un coup de mou
Avoir un coup de barre
Avoir un coup dans le nez
Avoir le moral dans les chaussettes
Avoir la tête sur les épaules
Avoir le sang chaud
Avoir froid aux yeux
Avoir les chevilles qui enflent
Avoir les mains liées
Avoir les idées noires
Avoir les jambes en coton
Avoir la gorge nouée
Avoir l’estomac dans les talons
Avoir la tête comme une pastèque
Avoir la tête ailleurs
Avoir un cœur d’artichaut
Avoir un cœur de pierre
Avoir un trou de mémoire
Avoir le compas dans l’œil
Avoir un petit vélo dans la tête
Avoir les nerfs à vif
Avoir le diable au corps
Avoir le vent en poupe
Avoir le dernier mot
Faire d’une pierre deux coups
Faire la pluie et le beau temps
Faire la grasse matinée
Faire la sourde oreille
Faire la fine bouche
Faire le mur
Faire les gros yeux
Faire les quatre cents coups
Faire des pieds et des mains
Faire tout un fromage
Faire tourner en bourrique
Faire mouche
Faire chou blanc
Faire marche arrière
Faire bande à part
Faire bonne figure
Faire contre mauvaise fortune bon cœur
Faire la tête
Faire la queue
Faire son cinéma
Faire son intéressant
Faire son beurre
Faire son trou
Faire table rase
Faire tache d’huile
Faire cavalier seul
Faire des ronds de jambe
Faire feu de tout bois
Faire flèche de tout bois
Faire les yeux doux
Faire un froid de canard
Faire un tabac
Faire un carton
Faire un malheur
Faire un bras d’honneur
Faire un pied de nez
Faire un clin d’œil
Faire un signe de la main
Faire un pas en avant
Faire un bond en arrière
Faire le dos rond
Faire l’autruche
Faire la moue
Faire le poireau
Faire le pitre
Faire le clown
Faire le ménage
Faire la manche
Faire des histoires
Faire des étincelles
Prendre la mouche
Prendre son courage à deux mains
Prendre le large
Prendre la poudre d’escampette
Prendre un râteau
Prendre la porte
Prendre le train en marche
Prendre le pli
Prendre du recul
Prendre la température
Prendre quelqu’un la main dans le sac
Prendre ses désirs pour des réalités
Prendre la vie du bon côté
Prendre la parole
Prendre le dessus
Prendre le taureau par les cornes
Prendre le temps de vivre
Prendre quelqu’un sous son aile
Prendre racine
Prendre un bain de soleil
Se prendre les pieds dans le tapis
Se prendre la tête
Se prendre une veste
Se prendre pour le nombril du monde
Se prendre au jeu
Se prendre les mains dans le sac
Se mettre sur son trente-et-un
Se mettre en quatre
Se mettre à table
Se mettre martel en tête
Se mettre au vert
Se mettre en boule
Se mettre en rang d’oignons
Se mettre à genoux
Se mettre hors de soi
Se mettre dans de beaux draps
Se mettre le doigt dans l’œil
Se jeter dans la gueule du loup
Se jeter à l’eau
Se jeter dans les bras de quelqu’un
Se creuser la tête
Se faire rouler dans la farine
Se faire mener par le bout du nez
Se faire du mauvais sang
Se faire tout petit
Se faire une montagne de quelque chose
Se faire tirer les oreilles
Se faire passer un savon
Se faire remonter les bretelles
Se faire avoir comme un bleu
Mettre les voiles
Mettre son grain de sel
Mettre la puce à l’oreille
Mettre les bouchées doubles
Mettre la main au feu
Mettre les points sur les i
Mettre le paquet
Mettre le feu aux poudres
Mettre de l’huile sur le feu
Mettre quelqu’un sur la touche
Mettre quelqu’un au pied du mur
Mettre la barre haut
Mettre la clé sous la porte
Mettre la corde au cou
Mettre la main dans le sac
Mettre quelqu’un dans sa poche
Mettre tous ses œufs dans le même panier
Mettre son nez partout
Mettre son nez dans les affaires des autres
Mettre les petits plats dans les grands
Mettre la pression
Mettre les pendules à l’heure
Mettre un coup de collier
Mettre du beurre dans les épinards
Mettre cartes sur table
Mettre quelqu’un sur un piédestal
Mettre les gaz
Mettre un pied devant l’autre
Mettre la main à la poche
Mettre un genou à terre
Jeter de l’argent par les fenêtres
Jeter un froid
Jeter un œil
Jeter un pavé dans la mare
Jeter l’éponge
Jeter son dévolu sur quelqu’un
Tourner la page
Tourner en rond
Tourner casaque
Tourner les talons
Tourner sept fois sa langue dans sa bouche
Tourner au vinaigre
Tourner comme une girouette
Tourner autour du pot
Retourner sa veste
Retourner le couteau dans la plaie
Couper l’herbe sous le pied
Couper la poire en deux
Couper court
Couper les ponts
Vendre la peau de l’ours avant de l’avoir tué
Quand le chat n’est pas là, les souris dansent
Petit à petit, l’oiseau fait son nid
Après la pluie, le beau temps
L’habit ne fait pas le moine
Qui ne tente rien n’a rien
Qui va à la chasse perd sa place
Qui vole un œuf vole un bœuf
Qui sème le vent récolte la tempête
Qui vivra verra
Qui dort dîne
Qui aime bien châtie bien
Qui trop embrasse mal étreint
Qui se ressemble s’assemble
Qui veut voyager loin ménage sa monture
Il ne faut pas mettre la charrue avant les bœufs
Il ne faut pas vendre la peau de l’ours avant de l’avoir tué
Il ne faut pas réveiller le chat qui dort
Il ne faut pas pousser mémé dans les orties
Il faut battre le fer quand il est chaud
Il faut tourner sept fois sa langue dans sa bouche
Il n’y a pas de fumée sans feu
Il n’y a que les imbéciles qui ne changent pas d’avis
Il n’est jamais trop tard pour bien faire
Il vaut mieux prévenir que guérir
Mieux vaut tard que jamais
Mieux vaut être seul que mal accompagné
Mieux vaut tenir que courir
Mieux vaut un petit chez-soi qu’un grand chez les autres
Les murs ont des oreilles
Les chiens ne font pas des chats
Les cordonniers sont les plus mal chaussés
Les absents ont toujours tort
Les bons comptes font les bons amis
L’argent ne fait pas le bonheur
L’appétit vient en mangeant
La nuit porte conseil
La vérité sort de la bouche des enfants
La faim justifie les moyens
La fin justifie les moyens
La parole est d’argent, le silence est d’or
Pierre qui roule n’amasse pas mousse
Tel père, tel fils
Tel est pris qui croyait prendre
Tout vient à point à qui sait attendre
Tout ce qui brille n’est pas or
Tous les goûts sont dans la nature
Une hirondelle ne fait pas le printemps
Un tiens vaut mieux que deux tu l’auras
À bon chat, bon rat
`);

const APERO_18_EXPRESSIONS = lines(`
Se prendre une cuite
Être bourré comme un coing
Être rond comme une queue de pelle
Avoir les dents du fond qui baignent
Boire comme un trou
Avoir une descente d’enfer
Avoir une bonne descente
Lever le coude
Se mettre minable
Finir sous la table
Rouler sous la table
Être frais comme un gardon
Être dans un état lamentable
Être à deux grammes
Être chargé comme une mule
Avoir la tête dans le cul
Avoir la gueule de bois
Avoir la bouche pâteuse
Avoir le casque à pointe
Avoir mal aux cheveux
Cuver son vin
Prendre l’apéro
Faire péter l’apéro
Ouvrir une binouze
S’en jeter un derrière la cravate
Se rincer le gosier
Se mettre une race
Se coller une murge
Se mettre une mine
Avoir un coup dans le nez
Péter un câble
Péter les plombs
Péter une durite
Péter un boulon
Partir en vrille
Partir en cacahuète
Partir en sucette
Partir en couille
Tourner au vinaigre
Ça sent le sapin
Ça sent le roussi
Ça pue du cul
Ça part en live
Ça part en freestyle
Ça va chier
Ça va barder
Ça va saigner
Ça va être sportif
Ça va être coton
Ça va finir en eau de boudin
Être dans la merde
Être dans la panade
Être dans le pétrin
Être dans de beaux draps
Être au fond du trou
Être dans la mouise
Être mal barré
Être dans la sauce
Être au bout du rouleau
Être rincé
Être claqué au sol
Être mort de fatigue
Être éclaté
Être explosé
Être défoncé de fatigue
Être lessivé
Être vidé
Être cramé
Être en PLS
Ramasser ses dents
Se faire démonter
Se faire éclater
Se faire déglinguer
Se faire rouler dessus
Se faire plier
Se faire fumer
Se faire atomiser
Se faire détruire
Se faire humilier
Se faire mettre à l’amende
Prendre cher
Prendre une cartouche
Prendre une branlée
Prendre une raclée
Prendre une dérouillée
Prendre une tannée
Prendre une claque
Prendre une gifle
Prendre un retour de bâton
Prendre un mur
Se prendre un râteau
Se faire recaler
Se faire jeter
Se faire larguer
Se faire tej
Se faire friendzoner
Se faire ghoster
Se faire planter
Se faire poser un lapin
Se faire mener en bateau
Se faire balader
Se faire pigeonner
Se faire avoir comme un bleu
Se faire rouler dans la farine
Se faire enfler
Se faire baiser la gueule
Se faire niquer
Se faire mettre profond
Se faire entuber
Se faire douiller
Casser les couilles
Casser les burnes
Casser les pieds
Casser les noix
Casser les bonbons
Faire chier
Emmerder le monde
Faire suer
Gonfler quelqu’un
Saouler quelqu’un
Prendre la tête
Se prendre la tête
Se faire des nœuds au cerveau
Se prendre le chou
Avoir quelqu’un sur le dos
Avoir quelqu’un dans le pif
Ne pas pouvoir blairer quelqu’un
Avoir envie de l’encastrer
Avoir envie de tout envoyer balader
Envoyer tout valser
S’en battre les couilles
S’en battre les steaks
S’en battre les reins
S’en foutre royalement
S’en contrefoutre
N’en avoir rien à foutre
N’en avoir rien à carrer
N’en avoir rien à cirer
N’en avoir rien à péter
S’en tamponner le coquillard
S’en taper le cul par terre
S’en torcher
S’en brosser le nombril
S’en laver les mains
S’en balancer
S’en moquer comme de sa première chaussette
S’en battre l’œil
S’en battre la race
S’en cogner
S’en foutre comme de l’an quarante
Rire comme un débile
Rire comme une baleine
Rire à s’en pisser dessus
Rire à s’en décrocher la mâchoire
Rire à s’en taper le cul par terre
Se marrer comme une baleine
Se fendre la poire
Se taper une barre
Se taper un fou rire
Être mort de rire
Pleurer de rire
Avoir les abdos en feu
Être plié en deux
Se rouler par terre
Se bidonner
Se marrer comme un bossu
Exploser de rire
Avoir un rire de phoque
Avoir un rire de hyène
Rire jaune
Se la péter
Se croire sorti de la cuisse de Jupiter
Péter plus haut que son cul
Se prendre pour le roi du pétrole
Se prendre pour le nombril du monde
Avoir le melon
Avoir la grosse tête
Avoir les chevilles qui enflent
Faire son beau
Faire le malin
Faire le kéké
Faire le coq
Faire le mariole
Faire le beau gosse
Faire le caïd
Faire son intéressant
Se prendre pour une star
Rouler des mécaniques
Jouer les gros bras
Faire le mâle alpha de supermarché
Être un beauf de compétition
Être beauf comme un barbecue tuning
Être lourd comme une enclume
Être lourd comme un repas de famille
Être relou comme pas possible
Être gênant comme un oncle bourré
Être cringe à mort
Être fin comme du gros sel
Être subtil comme un camion-benne
Être classe comme une chaussette trouée
Être élégant comme un barbecue en tongs
Être frais comme un slip de festival
Être propre comme un lendemain de cuite
Être habillé comme un sac
Être coiffé avec un pétard
Avoir une haleine de chacal
Sentir le fauve
Sentir le vieux kebab
Transpirer comme un bœuf
Avoir la classe américaine du camping municipal
Mettre la viande dans le torchon
Aller au plumard
Aller se pieuter
Aller pioncer
Aller ronfler
Dormir comme une masse
Dormir comme un loir
Ronfler comme un tracteur
Ronfler comme une tronçonneuse
Être affalé comme une larve
S’écraser dans le canapé
Faire la sieste du siècle
Comater devant la télé
Baver sur l’oreiller
Se réveiller la tête dans le cul
Sortir du lit comme un zombie
Marcher comme un lendemain de soirée
Être frais comme un cadavre
Avoir la tronche en biais
Avoir la gueule en vrac
Couler un bronze
Poser une pêche
Aller démouler un cake
Aller déposer les enfants à la piscine
Aller trôner
Aller aux chiottes
Avoir la taupe au guichet
Avoir le cigare au bord des lèvres
Péter comme un vieux diesel
Lâcher une caisse
Lâcher une bombe
Faire péter le compteur
Empester la pièce
Ouvrir les fenêtres
Faire fuir les voisins
Avoir le cul bordé de nouilles
Avoir le cul entre deux chaises
Avoir le feu au cul
Remuer du cul
Ne pas tortiller du cul pour chier droit
Être chaud comme la braise
Être chaud patate
Être chaud bouillant
Avoir les hormones en folie
Être en chien
Draguer comme un camionneur
Faire du rentre-dedans
Rouler une pelle
Se rouler une galoche
Se bécoter dans un coin
Chauffer la salle
Pécho en soirée
Se faire pécho
Avoir un crush
Avoir le coup de foudre
Tomber amoureux comme un con
Être fleur bleue sous 3 grammes
Sortir le grand jeu
Faire les yeux doux
Envoyer des signaux de détresse amoureuse
Mettre le feu au dancefloor
Danser comme un manche
Danser comme un daron bourré
Se déhancher comme un frigo
Faire le robot
Faire la chenille
Faire tourner les serviettes
Se prendre pour Patrick Sébastien
Ambiancer le PMU
Mettre l’ambiance au camping
Chanter comme une casserole
Gueuler comme un putois
Crier comme un veau
Hurler à la mort
Parler comme un charretier
Avoir une voix de camionneur
Faire le DJ de mariage
Mettre du Jul à fond
Faire le roi du karaoké
Ruiner l’ambiance
Y’a pas à tortiller du cul pour chier droit
Ça casse pas trois pattes à un canard
C’est pas le couteau le plus affûté du tiroir
C’est pas le pingouin qui glisse le plus loin
C’est pas le lampadaire le plus éclairé de la rue
Il n’a pas inventé l’eau chaude
Il n’a pas la lumière à tous les étages
Il manque une case
Il a été bercé trop près du mur
Il a le cerveau en RTT
`);

export const MIME_EXPRESSIONS: MimeExpression[] = [
  ...CLASSIC_EXPRESSIONS.map((text, index) => ({
    id: 30001 + index,
    category: "classique" as const,
    text,
  })),
  ...APERO_18_EXPRESSIONS.map((text, index) => ({
    id: 31001 + index,
    category: "apero_18" as const,
    text,
  })),
];

function lines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
