// Mime — architecture v2.
// Les catégories sont organisées dans un dictionnaire `MIME_PROMPTS_BY_CATEGORY`.
// Les IDs des deux catégories historiques (`classique`, `apero_18`) restent stables
// pour compatibilité avec d'anciennes parties archivées.

export type MimeExpressionCategory =
  | "classique"
  | "apero_18"
  | "imitations"
  | "animaux"
  | "chant_musique"
  | "scenes"
  | "internet_brainrot"
  | "horreur_cursed"
  | "absurde_wtf"
  | "beauf_france_profonde";

export interface MimeExpressionCategoryMeta {
  id: MimeExpressionCategory;
  label: string;
  emoji: string;
  description: string;
  adult: boolean;
  modeHint?: "free" | "sounds_only" | "classic";
}

export interface MimeExpression {
  id: number;
  category: MimeExpressionCategory;
  text: string;
  mimePlayerCountMin?: number;
  mimePlayerCountMax?: number;
}

export const MIME_EXPRESSION_CATEGORIES: MimeExpressionCategoryMeta[] = [
  {
    id: "classique",
    label: "Expressions classiques",
    emoji: "🎭",
    adult: false,
    description: "Proverbes et expressions du quotidien, faciles à lancer.",
    modeHint: "classic",
  },
  {
    id: "apero_18",
    label: "Expressions beauf",
    emoji: "🍻",
    adult: true,
    description: "Version familière, trash et sans filtre pour groupes adultes.",
    modeHint: "classic",
  },
  {
    id: "imitations",
    label: "Imitations",
    emoji: "🧑‍🎤",
    adult: false,
    description: "Célébrités, archétypes, PNJ et caricatures du quotidien.",
    modeHint: "free",
  },
  {
    id: "animaux",
    label: "Animaux & créatures",
    emoji: "🦊",
    adult: false,
    description: "Animaux réels, fantastiques, comportements et bruitages.",
    modeHint: "free",
  },
  {
    id: "chant_musique",
    label: "Chant & musique",
    emoji: "🎤",
    adult: false,
    description: "Chansons, rythmes et styles musicaux à fredonner.",
    modeHint: "sounds_only",
  },
  {
    id: "scenes",
    label: "Scènes & situations",
    emoji: "🎬",
    adult: false,
    description: "Scénarios de la vie quotidienne plus ou moins absurdes.",
    modeHint: "free",
  },
  {
    id: "internet_brainrot",
    label: "Internet & brainrot",
    emoji: "🧠",
    adult: false,
    description: "Mèmes TikTok, archétypes Twitch et chaos numérique.",
    modeHint: "free",
  },
  {
    id: "horreur_cursed",
    label: "Horreur & cursed",
    emoji: "👻",
    adult: true,
    description: "Mimes maudits, sombres ou volontairement dérangeants.",
    modeHint: "free",
  },
  {
    id: "absurde_wtf",
    label: "Absurde & WTF",
    emoji: "🌀",
    adult: false,
    description: "Situations impossibles, surréalistes, dignes d'un rêve étrange.",
    modeHint: "free",
  },
  {
    id: "beauf_france_profonde",
    label: "France profonde",
    emoji: "🏕️",
    adult: false,
    description: "BBQ, PMU, tuning, camping, tonton bourré — la vraie vie.",
    modeHint: "free",
  },
];

const CLASSIQUE = lines(`
Tomber dans les pommes
Donner sa langue au chat
Avoir la tête dans les nuages
Mettre les pieds dans le plat
Avoir le cœur sur la main
Poser un lapin
Avoir un chat dans la gorge
Tourner autour du pot
Passer du coq à l'âne
Avoir le bras long
Avoir les yeux plus gros que le ventre
Être dans la lune
Avoir un poil dans la main
Casser les pieds
Marcher sur des œufs
Jeter l'éponge
Mettre la main à la pâte
Avoir la pêche
Avoir la banane
Raconter des salades
Prendre ses jambes à son cou
Courir deux lièvres à la fois
Se serrer la ceinture
Avoir du pain sur la planche
Mettre les voiles
Avoir un coup de barre
Tomber des nues
Sortir du chapeau
Faire chou blanc
Sauter du coq à l'âne
Casser sa pipe
Filer à l'anglaise
Mettre sa main au feu
Se mettre martel en tête
Avoir les deux pieds dans le même sabot
Battre la chamade
Avoir la chair de poule
En faire tout un plat
Faire un froid de canard
Avoir le moral dans les chaussettes
Filer un mauvais coton
Avoir une faim de loup
Manger sur le pouce
Couper la poire en deux
Mettre la charrue avant les bœufs
Tirer le diable par la queue
Avoir la moutarde qui monte au nez
Avoir le cœur gros
Couper les ponts
Tirer son chapeau
Mettre les bouchées doubles
Avoir un mot sur le bout de la langue
Mettre le couteau sous la gorge
Ouvrir la boîte de Pandore
Aller à la pêche aux infos
Tomber de haut
Avoir le vent en poupe
Dormir sur ses deux oreilles
Avoir le démon de midi
Avoir une dent contre quelqu'un
Faire l'autruche
Avoir un cœur de pierre
Avoir le diable au corps
Mettre la clé sous la porte
Sortir de ses gonds
Voir la vie en rose
Avoir le cœur léger
Mettre les pendules à l'heure
Sauter de joie
Faire un tabac
Tomber à pic
Avoir la main verte
Avoir la grosse tête
Couper l'herbe sous le pied
Faire le pont
Mettre du beurre dans les épinards
Brûler la chandelle par les deux bouts
Mettre les pieds sous la table
Tirer les vers du nez
Se prendre un râteau
Tendre la perche
Brûler ses vaisseaux
Mettre la pression
Mettre la main dans le sac
Casser la baraque
Avoir un fil à la patte
Tomber dans les bras de Morphée
Mettre la table
Manger les pissenlits par la racine
Se prendre un vent
Faire la pluie et le beau temps
Mettre la cerise sur le gâteau
Avoir une faim de chien
Mettre les pieds dans le plat
Avoir la frite
Voir trente-six chandelles
Faire l'andouille
Tomber dans le panneau
Mettre les voiles au vent
Aller au charbon
Mettre la main au feu
Avoir le bras tendu
Y aller franco
Avoir la tête sur les épaules
Mettre le doigt dessus
Avoir un coup de foudre
Tomber amoureux
Mettre l'eau à la bouche
Avoir le sang chaud
Avoir un coup de mou
Tomber les masques
Avoir le pied marin
Avoir un grain
Avoir les oreilles qui sifflent
Avoir un cheveu sur la langue
Crier sur tous les toits
Faire l'école buissonnière
Ouvrir l'œil et le bon
Mettre des bâtons dans les roues
Avoir une mémoire d'éléphant
Avoir des fourmis dans les jambes
Mettre le doigt dans l'engrenage
Avoir un coup dans le nez
Avoir le bras cassé
Garder un chien de sa chienne
Avoir la gueule de bois
Avoir le cœur sur la main
Tirer la couverture à soi
Avoir les nerfs en boule
Boire la coupe jusqu'à la lie
Avoir la pêche d'enfer
Y mettre du sien
Mettre le grappin dessus
Avoir le coup de foudre
Se la couler douce
Manger ses mots
Ramener sa fraise
Avoir la patate
Tomber à l'eau
Casser du sucre sur le dos
Faire dans la dentelle
Mettre le paquet
Trouver chaussure à son pied
Se faire rouler dans la farine
Garder la pêche
Manger son chapeau
Avoir les jetons
Avoir les chocottes
Faire des pieds et des mains
Aller à fond de train
Aller à toute berzingue
Manger la grenouille
Casser sa croûte
Avoir un trou de mémoire
Avoir le ventre creux
Couper court à la conversation
Mettre la dernière main à
Avoir l'esprit d'escalier
Avoir un esprit de cochon
Faire son nid
Avoir le pied à l'étrier
Aller de Charybde en Scylla
Mettre la main sur le cœur
Faire bouillir la marmite
Avoir maille à partir
Casser les vitres
Mettre les bouts
Avoir la dalle
Avoir une dent dure
Aller au tapis
Reprendre du poil de la bête
Mettre les rieurs de son côté
Tirer le rideau
Avoir le moral des troupes
Tenir la chandelle
Faire long feu
Avoir bon dos
Lâcher du lest
Avoir un coup de pompe
Brûler les étapes
Manger son pain noir
Voir rouge
Crier au loup
Mettre sa main sur le feu
Avoir un nœud à l'estomac
Manger comme quatre
Tirer à pile ou face
Faire la fine bouche
Avoir la queue entre les jambes
Avoir le menton qui tremble
Avoir la tête de l'emploi
Tomber bien bas
Couper le souffle
Ne pas y aller de main morte
Avoir la chair de poule
Se prendre la tête
Avoir un coup de blues
Manger à la table de quelqu'un
Avoir bon pied bon œil
Mettre les bouts
Se serrer les coudes
Tirer la sonnette d'alarme
Avoir des yeux de braise
Avoir un mot doux
Aller à confesse
Mettre la pendule à l'heure
Avoir la fève dans la galette
Faire long voyage
Faire valoir ses droits
Faire la sourde oreille
Marcher dans les pas de quelqu'un
Mettre la dernière touche
Avoir des étoiles dans les yeux
Avoir un coup de cœur
Faire la chenille
Faire le mort
Faire le poireau
Se mettre sur son trente-et-un
Avoir le couteau entre les dents
Avoir une crampe dans les doigts
Mettre la sourdine
Tirer la chasse
Mettre la dernière touche
Manger le morceau
Avoir le ventre plein
Avoir un coup de foudre
Avoir la patate chaude
Mettre les rieurs de son côté
Tomber dans le filet
Sortir de l'auberge
Manger les rats
Tomber comme une mouche
Mettre les pieds en éventail
Mettre les mains dans le cambouis
Avoir des plombs dans la tête
Avoir un sacré coffre
Avoir des yeux d'ange
Mettre les pieds dans le plat
Faire des ronds dans l'eau
Avoir une faim de loup
Manger sur le pouce
Lâcher prise
Avoir la pêche au top
Mettre les bouchées triples
Avoir le moral en berne
Brûler son sang
Avoir des fourmis dans les pieds
Mettre la pression sur quelqu'un
Avoir un coup de chaleur
Mettre la main à l'épée
Avoir la dalle qui craque
Marcher sur la pointe des pieds
Avoir un sang d'encre
Avoir l'œil rivé sur quelqu'un
Pendre la crémaillère
Aller voir ailleurs
Manger ses mots
Mettre le feu aux poudres
Avoir un coup de cœur fou
Mettre les pieds dans le plat de spaghetti
Avoir le pied marin
Boire la tasse
Manger comme un ogre
Avoir un poil dans la main droite
Tirer le tapis sous les pieds
Avoir un cœur d'artichaut
Avoir une vie de chien
Avoir des oreilles partout
Boire jusqu'à plus soif
Faire ami-ami
Se serrer la ceinture cran par cran
Manger des yeux
Mettre la pédale douce
Aller au feu
Avoir l'esprit ailleurs
Avoir des plombs sur l'estomac
Tomber dans la marmite
Avoir le mal du pays
Avoir la chair de poule
Pleurer toutes les larmes de son corps
Manger comme un cochon
Voir des étoiles
Avoir un coup dans le nez
Avoir la fève
Avoir un coup de mou
Avoir les pieds sur terre
Avoir des yeux de chat
Avoir la trouille bleue
Avoir une faim de loup affamé
Mettre la corde au cou
Avoir le ventre vide
Manger trois fois trop
Tomber à la renverse
Mettre les mains au feu
Avoir le moral à zéro
Mettre la barre haute
Avoir la chair de poule sur le dos
Mettre la moitié du paquet
Faire crédit
Avoir les yeux pleins de larmes
Avoir un caractère de cochon
Aller à toute vitesse
Avoir des nœuds dans le cerveau
Avoir la pêche du tonnerre
Faire bonne figure
Avoir les mains liées
Avoir le bras cassé en deux
Mettre la dernière touche
Avoir une santé de fer
Avoir un fil tendu
Avoir le bras cassé
Avoir la tête à l'envers
Avoir le moral à plat
Avoir des étoiles dans la tête
Mettre la cerise sur la pizza
Avoir les chevilles qui enflent
Avoir un cœur en or
Avoir des oreilles fines
Avoir la peau dure
Avoir la tête dure
Avoir le bras lourd
Avoir le pied lourd
Avoir le pied léger
Avoir la dent dure
Faire la sourde oreille au monde
Avoir la patate à la place du cerveau
Avoir le foie qui crie
Avoir un cœur en plastique
Avoir une éponge sur la tête
Avoir une mémoire de poisson rouge
Avoir une vie de chien errant
Garder l'œil ouvert
Mettre les rats en cage
Boire à la santé
Manger la galette
Avoir la fève dans la bouche
`);

const APERO_18 = lines(`
Avoir le cul bordé de nouilles
Se faire chier comme un rat mort
Avoir un balai dans le cul
Se torcher la gueule
Avoir la gueule de bois
Pisser dans un violon
Pisser à côté de la cuvette
Se taper le cul par terre
Avoir une bite à la place du cerveau
Avoir un poil dans le slip
Avoir le cul entre deux chaises
Avoir la queue entre les jambes
Avoir une crotte au nez
Avoir une couille dans le potage
Se chier dessus de peur
Se torcher l'cul avec
Bouffer du curé
Bouffer son pain noir
Avoir une figue à la place du cerveau
Se faire mettre la rouste
Avoir les boules
Manger les pissenlits par la racine
Se prendre un mur
Avoir le feu au cul
Avoir le feu aux fesses
Avoir un cul de cinquante balais
Avoir une queue de cheval moche
Mettre la pâtée
Mettre une mandale
Mettre une beigne
Se prendre une grosse claque
Avoir le seum
Avoir la rage
Avoir la haine
Avoir la gerbe
Avoir la flemme
Avoir la cagoule
Pisser le sang
Cracher dans la soupe
Cracher au visage
Cracher des injures
Avoir un balai dans le derrière
Se gratter la couille
Se gratter le cul
Pisser sur les pompes
Pisser dans le bénitier
Faire la gueule
Avoir la grosse tête
Faire la gueule du chien
Avoir la dent contre
Avoir un coup dans l'aile
Avoir la cuite
Avoir la beuverie
Avoir la jaunisse
Tomber dans le coma
Tomber dans la cuvette
Cracher ses tripes
Bouffer du flic
Mettre la gomme
Avoir une dégaine de clochard
Avoir l'air d'un mort vivant
Avoir un cul en plomb
Avoir une tête de con
Avoir une tronche de cake
Avoir un nez de patate
Avoir des doigts saucisse
Avoir un caca sur le pas de la porte
Pisser à la face
Avoir l'haleine de phoque
Avoir une haleine de chacal
Avoir une haleine d'égout
Avoir une haleine de chien
Avoir des pets de cheval
Avoir le cerveau en RTT
Avoir une case en moins
Bouffer la moquette
Avoir une calotte
Manger la grenouille
Casser sa croûte
Avoir la pèche
Tomber en chemise
Avoir la tronche en biais
Avoir une dégaine de paysan
Avoir une dégaine de babouin
Avoir le coup de barre
Boire jusqu'à plus soif
Boire comme un trou
Boire comme un chameau
Avoir le bide
Avoir des couilles au cul
Avoir de la gueule
Avoir une grosse caisse
Avoir le coffre
Avoir la pipe à la main
Avoir une face de rat
Avoir des yeux de cochon
Pisser sur un chat
Pisser sur la couette
Cracher le morceau
Cracher la sauce
Crever la dalle
Crever de faim
Crever de soif
Crever de honte
Faire chier le monde
Faire chier sa mère
Avoir l'autruche dans le cul
Avoir la trompette
Avoir un coup de tatane
Avoir un coup de gueule
Avoir un coup de massue
Avoir un coup de boule
Avoir un coup de pied
Filer une grosse claque
Filer un grand coup
Filer un coup de pied au cul
Filer un coup de poing
Avoir les doigts dans la confiture
Se faire engueuler
Se faire allumer
Se faire ramoner
Se faire choper en pleine bourre
Avoir un poil de cul
Avoir une couille à l'horizon
Avoir une couille molle
Avoir la trouille au ventre
Avoir un coup dans la tronche
Avoir la rascasse
Bouffer ses morts
Bouffer la honte
Avoir une trogne de matelot
Cracher dans la soupe du voisin
Pisser dans son froc
Manger ses morves
Manger la poussière
Faire le con en soirée
Avoir des pieds plats
Avoir la patate au cul
Tomber sur la gueule
Aller au fond du trou
Avoir la gueule en biais
Avoir une tronche pas possible
Avoir la couenne
Pisser un coup
Pisser un torrent
Cracher dans le riz
Cracher des billes
Faire le mariole
Avoir une grosse tronche
Avoir une cervelle d'oiseau
Avoir une cervelle de moustique
Avoir le pied dans le tas
Avoir la dalle en sec
Avoir la dalle qui colle
Avoir une descente d'enfer
Tomber de tout son long
Manger une rouste
Manger une dérouillée
Manger une danse
Avoir une bonne tatane
Avoir un coup dans le ventre
Avoir des plombs dans le crâne
Avoir un poil au menton
Avoir le foie sec
Avoir des doigts crochus
Avoir la pèche au moral
Pisser sa rage
Pisser sa joie
Cracher la haine
Faire un coup vache
Manger le moustique
Avoir des couilles en or
Avoir une trogne de bouledogue
Avoir une trogne de truffe
Tirer la grosse caisse
Pisser dans la bière
Avoir le cul vissé
Avoir un coup au moral
Manger ses dents
Avoir le foie en compote
Boire jusqu'à la lie
Avoir un coup de pied dans le cul
Avoir des trous dans la tête
Cracher des pépins
Avoir une bouille de marmot
Avoir l'haleine de scarabée
Pisser comme une vache
Cracher des os
Avoir un coup de soleil
Avoir un coup de torchon
Avoir un coup de Lune
Avoir une cuite mémorable
Avoir la cuite du siècle
Manger ses morts
Pisser sur le drapeau
Cracher sur la tombe
Bouffer du curé en sauce
Aller chercher la merde
Faire son trou
Avoir la dèche
Avoir des plombs dans le rond
Avoir des plombs dans les fesses
Pisser dans son col
Cracher ses tripes au sol
Boire son urine
Bouffer sa colère
Avoir le ventre qui claque
Avoir des couilles dans le crâne
Avoir le bide à l'air
Avoir des fesses de cheval
Avoir la tronche défoncée
Avoir le cou tendu
Avoir un coup de sang
Avoir des yeux de cochon malade
Avoir le diable au cul
Cracher des perles
Cracher des oiseaux
Faire le bourricot
Avoir le bourrelet
Cracher ses pépins
Pisser sa joie en bière
Pisser sa hargne
Avoir un coup dans l'œil
Avoir la cuite façon Belge
Avoir un coup dans la nuque
Mettre une mandale magistrale
Avoir une trogne d'ivrogne
Pisser sa douleur
Cracher sa rage en mots
Boire à la santé du clochard
Bouffer la honte du quartier
Avoir une descente de pompier
Pisser sa joie en lessive
Cracher dans la soupière
Pisser sur les godasses du voisin
Cracher dans la cheminée
Bouffer la galette des rois
Avoir des miettes plein la barbe
Pisser un coup dans l'évier
Cracher des cailloux
Avoir des plombs au cerveau
Avoir le crâne en plomb
Avoir une casquette plombée
Pisser à la fenêtre
Cracher sur le pied
Faire le gros lard
Avoir la gueule défoncée
Avoir un cou de mulet
Avoir des plombs aux pieds
Pisser sur l'autoroute
Cracher sur le tapis
Mettre une beigne magistrale
Mettre une rouste de père
Mettre une dérouille de tonton
Avoir la fève au cul
Tomber en blouse
Avoir le slip mouillé
Avoir une gueule de minable
Avoir une dégaine de pignouf
Avoir une tronche de margoulin
Avoir une bouille de blaireau
Avoir une trogne de gros con
Avoir un coup au moral du soir
Avoir une cuite façon russe
Avoir une cuite façon polonaise
Manger ses morts en vacances
Pisser dans ses chaussettes
Cracher des pétards
Manger la moquette
Avoir une figure d'enterrement
Avoir la peau d'un cochon
Avoir le ventre qui sonne
Pisser dans le vent
Cracher dans le vent
Pisser à contre courant
Avoir la pêche sous les bras
Tirer la trogne
Mettre une raclée de père
Mettre une fessée publique
Faire le con devant les enfants
Pisser à côté des chiottes
Avoir un cul de minable
Avoir des plombs aux dents
Cracher sa moustache
Bouffer sa langue
Avoir un coup au foie
Y'a pas à tortiller du cul pour chier droit
Ça casse pas trois pattes à un canard
C'est pas le couteau le plus affûté du tiroir
C'est pas le pingouin qui glisse le plus loin
C'est pas le lampadaire le plus éclairé de la rue
Il n'a pas inventé l'eau chaude
Il n'a pas la lumière à tous les étages
Il manque une case
Il a été bercé trop près du mur
Il a le cerveau en RTT
`);

const IMITATIONS = lines(`
Un influenceur crypto qui parle de "passive income"
Un vendeur Fnac qui te conseille un câble HDMI à 50 €
Un joueur LoL toxique au mid game
Un boomer Facebook qui poste une photo de coucher de soleil
Un mec bourré au PMU qui parie sur le 7
Un prof de sport qui hurle "EN POSITION"
Un coach motivation TikTok à 7h du matin
Une caissière Carrefour fatiguée qui scanne lentement
Un agent de la Poste qui ferme à 16h59
Un serveur parisien condescendant
Un youtubeur qui dit "n'oubliez pas de liker"
Un streamer Twitch en pleine rage
Un président qui fait un discours
Un journaliste BFM en direct devant rien
Un médecin pressé qui regarde sa montre
Un coach perso qui te dit "encore une"
Un mec qui mansplain une recette
Un commercial qui veut absolument te faire signer
Un vigile qui pète plus haut que son cul
Un livreur qui sonne et part en 3 secondes
Un fan de Goldman qui chante "Quand la musique est bonne"
Un fan de Florent Pagny qui chante "Caruso"
Un mec qui drague maladroitement
Une influenceuse mode qui filme son outfit
Un cosplayer qui prend la pose
Un poète maudit qui déclame en terrasse
Un dresseur de chiens qui dit "TOM ! ASSIS !"
Un guide touristique qui parle trop fort
Un syndicaliste en grève qui mégaphone
Un commissaire-priseur qui adjuge
Un philosophe qui réfléchit en grimaçant
Un magicien qui rate son tour
Un mime qui galère
Un ventriloque qui se trahit
Un guichetier de gare qui ferme à ton tour
Un steward qui mime les consignes de sécurité
Un commerçant qui invective les passants
Un chef cuisinier qui hurle "OUI CHEF"
Un sergent instructeur qui fait des pompes
Un télévendeur qui crie "À PRIX CASSÉ"
Une grand-mère qui ne trouve pas ses clés
Un grand-père qui s'endort au repas
Un papy qui sort sa vieille blague
Un tonton qui drague à un mariage
Une tata qui te demande "alors les amours"
Un footballeur qui simule une faute
Un arbitre de foot qui sort un carton
Un coach foot qui chiale sur la touche
Un boxeur qui esquive
Un golfeur qui rate un putt
Un tennisman qui smashe et hurle
Un nageur qui mime la brasse coulée
Un karatéka qui pousse un kiai
Un sumo qui pousse l'autre
Un dirigeant nord-coréen qui acclame une foule
Un gourou qui hypnotise son public
Un télévangéliste qui guérit un fidèle
Un rappeur qui freestyle avec mood
Un DJ qui drop le beat
Un guitariste qui fait un solo air guitar
Un batteur qui s'éclate en concert
Un chef d'orchestre énervé
Un acteur de théâtre qui surjoue
Un présentateur de jeu télé qui dit "À VOUS"
Un poker player qui bluffe à fond
Un croupier de casino impassible
Un yogi qui salue le soleil
Un nageur olympique qui se prépare au plot
Un fitgirl qui prend un selfie miroir
Un mec qui squatte les machines à la salle
Un jardinier qui taille fièrement
Une fleuriste qui sniffe ses bouquets
Une serveuse qui prend la commande sans noter
Un caviste qui sent un vin avec emphase
Un fromager qui te fait sentir un Maroilles
Un boucher qui frappe sa viande
Un poissonnier qui hèle les clients
Un boulanger fatigué à 4h du matin
Un pharmacien qui te juge silencieusement
Un médecin de campagne très patient
Une nounou qui chante "Une souris verte"
Un instit qui calme la classe
Un proviseur qui te convoque
Un avocat qui plaide passionnément
Un juge qui frappe son marteau
Un detective qui inspecte la scène
Un commissaire qui interroge un suspect
Un agent secret en planque
Un pickpocket en action
Un voleur de banque maladroit
Un escroc à la Tinder
Un dragueur de boîte qui se prend un vent
Une diva qui demande sa loge
Un metteur en scène mécontent
Un photographe qui mitraille
Un journaliste people qui poursuit
Un journaliste sportif en direct
Un présentateur météo joyeux
Un astrologue qui lit ton thème
Un voyant qui voit ton futur
Un cartomancien qui retourne les cartes
Un médium qui parle aux morts
Un exorciste très calme
Un curé qui bénit l'apéro
Un curé qui dit la messe
Un rabbin sur l'estrade
Un prêcheur évangéliste en transe
Un militant qui tracte sur le marché
Une mamie qui te bénit avec ses dents
Un client mécontent au SAV
Un employé qui fait semblant de bosser
Un patron qui te convoque
Un comptable qui découvre une erreur
Un trader qui regarde ses courbes
Un banquier qui refuse ton crédit
Un commercial qui fait un appel à froid
Un consultant qui dessine au tableau
Un développeur en deadline
Un designer qui défend son choix de couleur
Un freelance qui négocie sa TJM
Un patron qui pète un câble
Un stagiaire qui essaie d'être utile
Un coach agile qui fait un stand-up
Un product owner qui pose des post-its
Un sysadmin qui voit tout cramer
Un community manager qui répond à un haineux
Une influenceuse food qui filme son brunch
Un voyageur Instagram qui pose face au coucher de soleil
Un yogi luxe qui fait l'arbre face à la mer
Un blogueur lifestyle qui range son lit
Un mec qui présente sa playlist au public
Un fan de F1 qui mime un dépassement
Un fan de WWE qui catche un adversaire
Un commentateur de boxe excité
Un commentateur de hippisme qui crie "POULBOT À LA CORDE"
Un fan de pétanque sérieux à mort
Un karaokéiste forcé à chanter Goldman
Un karaokéiste qui assassine "Bohemian Rhapsody"
Un karaokéiste qui pleure sur "Hey Jude"
Un militaire qui salue solennellement
Un capitaine de bateau qui regarde l'horizon
Un pilote d'avion qui mime le décollage
Un parachutiste qui mime sa chute
Un alpiniste épuisé près du sommet
Un explorateur qui plante un drapeau
Un astronaute qui flotte
Un robot qui se dérègle
Un PNJ qui répète la même phrase
Un boomer qui ne sait pas finir un mail
Un boomer qui découvre un emoji
Un boomer qui force un câlin
Un boomer qui ferme la porte au nez à un témoin de Jéhovah
Un ado qui scrolle sans expression
Un ado qui simule un évanouissement
Un ado qui demande de l'argent à son père
Un ado qui se prend pour Jésus en stories
Un gosse en colère sans raison
Un gosse qui demande "POURQUOI" 50 fois
Un papa qui revisse une chaise IKEA
Une maman qui crie "TON LIT MAINTENANT"
Une belle-mère qui inspecte ton appart
Un voisin qui tond à 8h du matin
Un voisin qui sonne pour réclamer un colis
Un type qui klaxonne pour rien
Un piéton qui traverse n'importe où
Un cycliste qui grille un feu
Un trottinettiste qui slalome
Un automobiliste qui sort de la voiture pour engueuler
Un mec qui aboie sur un télévendeur
Un fan de fantasy qui parle elfique
Un fan de Star Wars qui fait Yoda
Un fan d'Harry Potter qui fait Hermione
Un fan de Marvel qui mime un combat
Un fan d'anime qui pose en mode "OH NON KAKAROT"
Un Pokémon trainer qui lance un Pokéball
Un cosplayer Vegeta en transe
Une influenceuse Beauty qui swatch un rouge à lèvres
Un mannequin sur le catwalk
Un coach séduction qui te montre comment "tenir le frame"
Une matronne qui aboie sur un livreur
Un dictateur qui salue ses troupes
Une élue qui découpe un ruban tricolore
Une serveuse de bistrot qui crie "MAISON"
Un crémier qui te fait sentir un fromage
Un poissonnier qui te hèle au marché
Un musicien des rues qui passe le chapeau
Un mendiant qui crie "PIÈCE M'SIEUR"
Un démarcheur qui sonne et insiste
Un coach scolaire qui hurle "FOCUS"
Un coach prépa qui te casse moralement
Un sniper qui vise patiemment
Un détective Sherlock qui inspecte une loupe
Un poète parisien qui slame
Un brocanteur qui marchande à la dure
`);

const ANIMAUX = lines(`
Un chat qui se faufile sous un meuble
Un chien qui chasse sa queue
Une vache qui rumine en mâchant
Un cheval qui hennit et se cabre
Un singe qui se gratte la tête
Un éléphant qui trompette
Un kangourou qui bondit
Un koala accroché à un eucalyptus
Un paresseux qui se déplace au ralenti
Un dauphin qui fait des bonds
Un requin qui chasse
Une pieuvre qui s'enroule
Un crabe qui marche de côté
Un homard qui claque ses pinces
Une crevette qui fait l'imbécile
Un poisson rouge qui tourne en rond
Une grenouille qui saute sur une feuille
Un crapaud qui gonfle sa gorge
Un serpent qui rampe et tire la langue
Un caméléon qui change de couleur
Une tortue qui rentre la tête
Un lapin qui détale en zigzag
Un écureuil qui ronge une noix
Un hamster qui court dans sa roue
Un castor qui ronge un tronc
Une chouette qui tourne la tête
Un hibou qui plisse les yeux
Un aigle qui plane
Un faucon qui pique en piqué
Une pigeon urbain mal en point
Un canard boiteux
Un cygne majestueux
Une oie agressive
Un coq qui fait son show
Une poule qui pond
Un poussin qui suit sa mère
Un paon qui fait la roue
Un perroquet qui répète
Un toucan qui se nettoie le bec
Un flamant rose sur une patte
Un pélican qui pêche
Un manchot qui marche en se dandinant
Un pingouin qui glisse sur la glace
Un ours qui chasse du saumon
Un panda qui se vautre dans le bambou
Un raton laveur qui fouille une poubelle
Un blaireau en colère
Un loup qui hurle à la lune
Un renard qui rôde
Une biche qui broute
Un cerf qui brame
Un sanglier qui charge
Un boeuf qui meugle
Un mouton qui broute
Une chèvre qui escalade un rocher
Un âne qui brait
Un mulet têtu
Un dromadaire qui crache
Un chameau dans le désert
Un lion qui rugit
Un tigre qui rôde
Une panthère qui s'étire
Un guépard qui détale
Une hyène qui ricane
Un gorille qui se frappe la poitrine
Un orang-outan qui se balance
Un chimpanzé qui imite quelqu'un
Une licorne qui hennit
Un dragon qui crache du feu
Un griffon qui prend son envol
Un phénix qui renaît
Un yéti qui se cache
Un cerbère qui aboie à trois têtes
Un kraken qui sort de l'eau
Une sirène qui se peigne
Un loup-garou qui se transforme
Un vampire qui se transforme en chauve-souris
Une chauve-souris qui sonore
Un dragon comodo qui sort la langue
Un iguane qui prend le soleil
Un lézard qui fait des pompes
Une mygale qui chasse
Une scolopendre qui rampe
Une fourmi qui porte une miette
Un cafard qui esquive un journal
Une mouche qui agace
Un moustique qui pique
Une abeille qui butine
Un bourdon ivre
Un papillon qui virevolte
Une chenille qui se transforme en cocon
Un escargot qui rentre sa coquille
Une limace qui glisse lentement
Un hippopotame qui baille
Un rhinocéros qui charge
Une girafe qui broute en hauteur
Un zèbre qui galope
Un okapi qui se cache
Un suricate qui fait le guet
Un tamia qui stocke ses graines
Un opossum qui fait le mort
Un wombat qui creuse
Un dingo qui hurle
Un porc-épic qui se hérisse
Un tatou qui se roule en boule
Un fourmilier qui sort sa langue
Un narval qui plonge avec sa licorne
Un orque qui saute
Une baleine qui crache son jet
Un cachalot qui plonge
Un piranha qui mord
Un anaconda qui constrict
Un cobra qui se dresse
Un boa qui s'enroule
Un yack qui broute en altitude
Un bison qui charge
Une mante religieuse qui prie
Un crocodile qui surgit
Un alligator qui sort de l'eau
Une tortue marine qui pond
Un narval qui se bat
Un canard qui boite
Un poussin qui pépie
Un faisan qui s'envole bruyamment
Une autruche qui plante sa tête
Un casoar qui charge
Un kiwi qui farfouille
Une raie qui plane
Une murène qui sort de son trou
Une étoile de mer qui glisse
Un hippocampe qui dérive
Un poisson-clown qui se cache dans l'anémone
Un loup de mer qui jappe
`);

const CHANT_MUSIQUE = lines(`
Fredonner "Joyeux anniversaire"
Fredonner la marseillaise sans paroles
Faire les premières notes de "Imagine"
Faire la mélodie de "Smells Like Teen Spirit"
Faire le riff de "Smoke on the Water"
Faire le beat de "Seven Nation Army"
Imiter Whitney Houston sur "I Will Always Love You"
Imiter Céline Dion qui pousse une note
Imiter Mariah Carey qui monte dans les aigus
Imiter Freddie Mercury sur "Bohemian Rhapsody"
Imiter Bob Marley qui chante "No Woman No Cry"
Imiter Goldman sur "Quand la musique est bonne"
Imiter Florent Pagny sur "Caruso"
Imiter Mylène Farmer mystérieuse
Imiter Lara Fabian qui s'effondre
Imiter Pavarotti qui pousse "Nessun Dorma"
Imiter Beyoncé en danse staccato
Imiter Rihanna qui susurre
Imiter Taylor Swift qui tape du pied au rythme
Imiter Drake qui freestyle
Imiter Kanye West qui s'embrouille
Imiter Booba avec mood
Imiter PNL en mood ambiance
Imiter Damso qui flotte
Imiter Aya Nakamura qui claque la langue
Imiter Stromae qui danse "Papaoutai"
Imiter Indochine en concert
Imiter Téléphone "Cendrillon"
Imiter Renaud bourré "Mistral gagnant"
Imiter Brel sur "Ne me quitte pas"
Imiter Gainsbourg qui chuchote
Imiter Édith Piaf "Non, je ne regrette rien"
Imiter Claude François qui danse "Alexandrie Alexandra"
Imiter Mike Brant qui se penche
Imiter Joe Dassin "Les Champs-Élysées"
Imiter Carlos qui rigole
Imiter Sardou qui braille
Imiter Patrick Bruel "Casser la voix"
Imiter Calogero qui se déchaîne
Imiter Vianney qui sourit naïvement
Imiter Maître Gims sous lunettes
Imiter Soprano qui sourit
Imiter Jul qui balance "wesh wesh"
Imiter Naps tranquille
Imiter Aurélien Bedeneau qui scratche
Imiter Vald qui rappe lentement
Imiter Niska "BAOUYAH"
Imiter Orelsan philosophique
Imiter Lomepal mélancolique
Imiter Eddy de Pretto puissant
Imiter Pomme intimiste à la guitare
Imiter Clara Luciani avec une cape
Imiter Angèle qui chante "Balance ton quoi"
Imiter Lous and the Yakuza ténébreuse
Faire le générique de Friends
Faire le générique de Game of Thrones
Faire le générique d'Inspecteur Gadget
Faire le générique de Pokémon
Faire le générique de Star Wars
Faire le générique de Harry Potter
Faire le générique d'Indiana Jones
Faire le générique de Mission Impossible
Faire le générique de James Bond
Faire le générique de The Lion King "Naaaaa Tsiviiiya"
Faire la mélodie de "Let It Go"
Faire la mélodie de "Libéreée délivrée"
Faire la mélodie de "Hakuna Matata"
Faire la mélodie de "Under the Sea"
Faire la mélodie de "A Whole New World"
Faire la mélodie de "Beauty and the Beast"
Faire la mélodie de "Tale as Old as Time"
Faire la mélodie de "Reflection" (Mulan)
Faire la mélodie de Titanic "My Heart Will Go On"
Faire la mélodie de "Hallelujah"
Faire la mélodie de "Wonderwall"
Faire la mélodie de "Don't Look Back in Anger"
Faire la mélodie de "Wonderful Tonight"
Faire la mélodie de "Stairway to Heaven"
Faire la mélodie de "Hotel California"
Faire la mélodie de "Sweet Child o' Mine"
Faire la mélodie de "Highway to Hell"
Faire la mélodie de "Welcome to the Jungle"
Imiter un opéra dramatique
Imiter un slam parisien
Imiter un rap battle
Imiter un beatbox basique
Imiter un beatbox avancé
Faire un solo de batterie air-drum
Faire un solo de basse silencieux
Faire un solo de saxophone mimé
Faire un solo de trompette mimé
Faire un solo de violon dramatique
Faire un solo de piano émouvant
Faire une polka endiablée
Faire un jazz cool en doigts qui claquent
Faire un swing années 50
Faire un rock'n'roll années 60
Faire un disco années 70
Faire une techno années 90
Faire une trance avec bras en l'air
Faire un dubstep avec drop
Faire un reggaeton lent
Faire un k-pop en chorégraphie
Faire un boys band 90s synchronisé
Faire une chorégraphie de Britney Spears
Faire une chorégraphie de Michael Jackson moonwalk
Faire une chorégraphie de Beyoncé
Faire une chorégraphie de Madonna "Vogue"
Faire une chorégraphie de Lady Gaga "Bad Romance"
Faire le robot dance
Faire le breakdance basique
Faire la chenille
Faire le madison
Faire le tecktonik
Faire le harlem shake
Faire le moonwalk
Faire la macarena
Faire la lambada
Faire le saturday night fever
Faire le voguing
Faire un tango passionné
Faire une valse virevoltante
Faire un cha-cha-cha rapide
Faire un rumba lent
Faire une java accordéon
Faire un sirtaki crétois
Faire une polonaise distinguée
Faire un solo de jazz manouche
Faire un berceuse douce
Faire une comptine pour bébé
Faire la sonnerie de l'iPhone
Faire la sonnerie de Nokia 3310
Faire le bruit du modem 56k
Faire la pub Mentos joyeuse
Faire la pub Renault Clio "shifumi"
Faire la pub Haribo "j'aime tellement ça"
Faire un karaoké forcé Goldman
Faire un karaoké forcé Pagny
Faire un karaoké forcé Carla Bruni
Faire un karaoké de "Hey Jude" qui pleure
Faire un karaoké de "Bohemian Rhapsody" en panique
Imiter un coq qui chante l'hymne
Imiter une chorale enfantine qui désaccorde
Imiter un crooner qui se penche
Imiter un yodel suisse
Imiter un chant grégorien
Imiter une fanfare militaire
Imiter une marching band américaine
Imiter une samba brésilienne au tambour
Imiter une fanfare de quartier
Imiter un chant des supporters au foot
Imiter "Allez les bleus" au stade
Imiter "Olé olé olé"
Imiter un riff de heavy metal
Imiter un growl de death metal
Imiter une voix d'opéra masculin
Imiter une voix d'opéra féminin
Imiter une voix de barbershop quartet
Faire le bruit d'une cymbale qui crash
Faire le bruit d'un piano cassé
Faire le solo de fin de "Hey Jude"
Faire le break de "Stayin' Alive"
Faire la danse "Soulja Boy"
Faire la danse "Crank That"
Faire la danse "Y.M.C.A."
Faire la danse "Gangnam Style"
Faire la danse "Macarena"
Faire la danse "Saturday Night"
Faire le pas de la salsa cubaine
Faire le pas du paso doble
Faire le pas du flamenco
Imiter un musicien chinois traditionnel
Imiter une chorale gospel qui décolle
Imiter un sample EDM qui drop
Imiter une boîte à musique qui se grippe
Imiter une harpe céleste
Faire le bourdonnement d'un didgeridoo
Faire le bruit d'une cornemuse
Faire le solo de "Eye of the Tiger"
Faire le solo de "We Are the Champions"
Faire le solo de "Don't Stop Believin'"
`);

const SCENES = lines(`
Perdre ses clés et fouiller toutes les poches
Marcher sur un Lego pieds nus
Ouvrir un pot de confiture impossible
Bugger devant un distributeur en panne
Essayer de draguer maladroitement
Se faire contrôler par un agent SNCF
Cacher quelque chose derrière son dos
Chercher son téléphone en l'ayant en main
Pousser une porte "tirez"
Tirer une porte "poussez"
S'enfermer dehors en pyjama
Se cogner contre une vitre transparente
Glisser sur une peau de banane
Sauter pour attraper un truc trop haut
Pédaler en VTT dans la boue
Conduire avec un GPS qui beugue
Faire la queue à la Poste 1h
Tomber dans le métro à 8h
Essayer de monter dans un bus bondé
Se faire spamer par un démarcheur dans la rue
Sortir un câlin gênant
Mettre la mauvaise clé dans la serrure
Brûler la sauce sur le feu
Faire la vaisselle en pestant
Plier un drap-housse impossible
Monter un meuble IKEA sans notice
Visser un truc à l'envers
Démonter un emballage Amazon résistant
Essayer d'attraper une mouche à la main
Tuer un moustique sur le mur
Sécher une chaussette mouillée au sèche-cheveux
Repasser une chemise impossible
Faire ses lacets en marchant
Tirer un chariot bloqué
Ramasser ses courses qui se cassent au sol
Compter sa monnaie devant 10 personnes pressées
Tâter ses poches sans son portefeuille
Vérifier que son portefeuille est encore là
Faire semblant d'écouter au boulot
Faire semblant de prendre des notes
Faire semblant d'aimer un cadeau
Faire semblant d'aimer un plat moche
Faire semblant de comprendre un blague étrangère
Faire semblant de rire à une blague nulle
Faire semblant de pleurer au cinéma
Faire semblant d'avoir entendu la consigne
Faire semblant d'être réveillé en réunion
Faire semblant d'être passionné par un sport
Essayer de chuchoter mais parler trop fort
Essayer de se rappeler un mot oublié
Essayer d'éternuer en silence
Bâiller en pleine présentation
Se gratter discrètement
Cacher un pet en réunion
Cacher un rire en plein deuil
Cacher un piercing à la fac
Sortir d'une voiture avec dignité
Sortir d'un sac de couchage à la dure
Sortir d'un canapé profond
Sortir de la mer en mode beach volley
Entrer dans un café en mode ange
Entrer dans un restau étoilé en mode "j'assume"
Entrer dans un sport en retard en marchant à pas feutrés
Faire sa rentrée parisienne avec robe trop grande
Tomber d'un escalator
Tomber dans une bouche d'égout
Tomber dans la fontaine du parc
Tomber d'une trottinette électrique
Tomber d'un vélo à pignon fixe
Se prendre un poteau
Se prendre une porte vitrée
Se prendre une rame de métro en pleine face
Glisser sur une plaque verglacée
Glisser sur une flaque d'eau
Patiner sur un sol en marbre
Faire le mannequin sur les Champs-Élysées
Faire le touriste perdu à Pigalle
Faire le local qui frime sur les Halles
Faire la file d'attente au Louvre
Faire le selfie devant la Tour Eiffel
Faire le selfie en mode "j'ai mis 3h pour ça"
Faire la danse de la victoire après une note
Faire la danse du bonheur après un coup de fil
Faire la danse de la pluie déçue
Faire la danse mariage forcé
Réaliser un trick de skateboard raté
Faire un wheelie en BMX
Sauter sur un trampoline et se prendre le filet
Faire l'arbre dans un cours de yoga
Faire la chandelle en cours de gym
Tenter le grand écart et se fouler
Faire un push-up impossible
Faire une planche qui s'effondre
Faire des squats moches
Faire un burpee mou
Faire un sprint au feu vert
Courir après un bus qui démarre
Courir après un livreur qui s'enfuit
Courir derrière un sac volé
Demander un autographe à une fausse célébrité
Demander une augmentation à son boss
Demander un câlin à un chat
Demander un câlin à un parent grognon
Demander un service à son ex
Demander pardon à sa belle-mère
Demander pardon à son chien
Demander pardon à un caissier énervé
Rendre la monnaie en pièces de 5 centimes
Compter des billets en cachette
Compter ses points de fidélité Carrefour
Préparer son sac de plage
Préparer sa valise à 4h du matin
Préparer un café à la cafetière capricieuse
Préparer un thé en oubliant l'eau chaude
Faire un selfie miroir cringe
Faire un selfie avec un filtre catastrophique
Faire un selfie de groupe pendant que tout le monde cligne
Faire un selfie en haut d'une montagne épuisé
Faire un selfie en falaise pour la story
Faire la photo de famille forcée
Faire la photo de mariage en mode froid
Faire la photo de classe avec dispute
Présenter sa nouvelle copine à ses parents
Présenter sa nouvelle copine à son ex
Présenter son boss à ses parents
Présenter son chien à un autre chien
Brancher une multiprise saturée
Brancher un câble HDMI à l'aveugle derrière une télé
Désinstaller un logiciel qui ne veut pas partir
Désinstaller un câble derrière le PC
Démouler un gâteau qui s'effondre
Démouler un flan qui colle
Sortir un panettone du four sans gants
Sortir un gratin trop chaud sans gants
Mettre une bûche dans une cheminée
Allumer un feu de camp sous la pluie
Faire un château de sable qui s'effondre
Faire un bonhomme de neige qui fond
Faire un nœud papillon avant un mariage
Faire un nœud de cravate à l'aveugle
Faire un chignon improvisé
Faire un brushing pressé
Faire un masque facial qui colle
Tomber dans un piège pour touriste
Tomber dans une arnaque crypto évidente
Tomber dans le panneau d'une farce
Tomber dans les bras d'un inconnu
Recevoir une mauvaise nouvelle par téléphone
Recevoir une bonne nouvelle au boulot
Recevoir un cadeau hideux à Noël
Recevoir un texto gênant en public
Recevoir un message vocal de sa mère
Recevoir un coup de fil de sa banque
Faire un canular téléphonique
Faire un appel masqué et raccrocher
Faire un message vocal qu'on regrette
Faire un FaceTime avec une mamie qui crie
Faire un cours en visio avec son chat sur le clavier
Faire un live Instagram cringe
Faire un BeReal sans charme
Faire un Snap inopportun
Faire un TikTok trend en retard de 6 mois
Faire un POV "quand tu réalises…"
Sortir d'un grand magasin avec trop de sacs
Sortir d'une boîte à 4h du matin en pleurs
Sortir d'un mariage en titubant
Sortir d'un enterrement en croisant un comique
Faire l'inventaire d'un frigo vide
Faire l'inventaire d'un sac à dos chaotique
Faire l'inventaire d'un placard plein de Tupperware
Tester un parfum trop fort
Tester un dentifrice à la cannelle
Tester un café trop serré
Tester une bière artisanale infecte
Goûter un piment trop fort
Goûter un fromage périmé
Goûter un yaourt douteux
Goûter un kombucha qu'on n'aime pas
Embrasser quelqu'un par erreur
Embrasser une joue au lieu d'une autre
Saluer un inconnu en pensant le connaître
Saluer la mauvaise personne dans la rue
Confondre son boss avec un client
Confondre un chat avec un autre chat
Démarrer une voiture qui ne veut pas démarrer
Pousser une voiture en panne
Mettre de l'essence au mauvais réservoir
Faire un créneau impossible
Faire un demi-tour interdit en mode panique
Garer une trottinette sur un emplacement
Réveiller un ami au téléphone à 3h du matin
Réveiller son colocataire avec un haut-parleur
Réveiller son chat le matin
Réveiller son chien à la sieste
Faire pipi en pleine nature
Faire pipi dans un buisson urbain
Faire pipi dans un bar bondé
Faire pipi dans un train qui tangue
Faire ses besoins dans un avion turbulence
Tenter d'attraper un kébab qui glisse
Tenter d'attraper une part de pizza ruisselante
Tenter d'attraper un nuggets qui tombe
Tenter d'attraper un cocktail sur un plateau
Tenter de fermer une fermeture éclair coincée
Tenter de boucler une ceinture de sécurité tendue
Tenter d'ouvrir un sac plastique
Tenter de défaire un nœud chinois
Imiter quelqu'un qui dort la bouche ouverte
Imiter quelqu'un qui rêve d'une tarte
Imiter quelqu'un qui ronfle bruyamment
Imiter quelqu'un qui parle dans son sommeil
Imiter quelqu'un qui se réveille en sursaut
Imiter un sandwich qui s'effondre
`);

const INTERNET_BRAINROT = lines(`
Le sigma male qui regarde au loin
Le NPC qui répète "Hi welcome to Chili's"
Le streamer Ohio qui crie "skibidi"
Le mec qui dit "rizz" en cligant
Le streamer rage qui hurle "RATIO"
Le TikTok live mendiant pour des cadeaux
Le "chat is this real?" qui regarde sa caméra
Le mewing qui tient son menton
Le gooner épuisé
Le gamer rage qui casse sa souris
Le looksmaxxing qui s'analyse au miroir
Le coquette girl en ruban rose
Le indie sleaze 2009 en photo flash
Le Y2K rave fluo
Le e-girl avec petits cœurs
Le e-boy fringe sur les yeux
Le main character moment dans le métro
Le NPC walk en mode "Ohio behavior"
Le "I'm just a girl" en mode Barbie
Le red flag girl qui sourit malicieusement
Le green flag boy qui tient une porte
Le boomer qui ne sait pas finir un mail
Le karen qui parle au manager
Le Chad qui regarde au loin
Le Wojak triste qui pleure
Le Doomer en hood noir
Le BloomeR optimiste matin
Le pretentious indie boy qui parle de vinyles
Le book-tok girl qui crie "no spoilers"
Le influenceur crypto qui parle de "passive income"
Le bro fitness qui flex devant le miroir
Le poseur de gymrat sur Insta
Le DJ qui tape sur sa tablette
Le streamer qui ajuste sa webcam
Le shadow ban victim qui regarde son téléphone
Le ratio victim qui supprime un tweet
Le influencer voyage qui regarde un coucher de soleil
Le pomme-pomme fashion week qui pose
Le instagram husband en mode "encore une"
Le booktok-er qui pleure sur "It Ends with Us"
Le Twitter politique qui s'embrouille
Le redditor qui dit "actually"
Le 4chan anon qui chuchote
Le LinkedIn humbleBrag qui parle de sa "journey"
Le "thoughts and prayers" automatique
Le manifest girl qui visualise sa réussite
Le yoga girl qui salue le soleil
Le aura points en chute libre
Le aura points qui explosent
Le rizz fail en boîte
Le rizz god qui claque des doigts
Le erm acshually quasi-coquin
Le Sigma walk au ralenti
Le mewing devant le miroir
Le looksmaxxing en mode anime
Le glow up speedrun
Le ick face devant un crush
Le pick me girl qui rit fort
Le pick me boy qui parle de jeux vidéo
Le manic pixie dream girl qui twirl
Le NPC dialogue qui boucle
Le "this you?" en mode sceptique
Le screenshot screenshoter qui photographie l'écran
Le tea spill en story Insta
Le "send" pre-screenshot qui prépare son DM
Le doom scroll à 4h du matin
Le fyp brainrot d'une heure non stop
Le BeReal qui s'envoie en pyjama
Le BeReal qu'on rate exprès
Le selfie qui rate sa pose
Le "first" comment qui se dépêche
Le ratio comment qui dunk
Le shadowban check qui crie "POURQUOI"
Le mug check à 7h du matin
Le coffee snob qui sniff sa tasse
Le matcha latte girl qui pose
Le iced latte qui aspire la paille
Le gym selfie qui flex le biceps
Le mirror selfie filtré
Le bathroom selfie cringe
Le airport selfie en mode hot girl walk
Le hot girl walk avec écouteurs et soleil
Le sad girl walk en pluie
Le pilates girl en justaucorps
Le crossfit bro qui squatte
Le pickleball middle-aged qui sourit
Le tradwife qui bat des œufs
Le e-pope qui jure
Le boomer humour Facebook
Le boomer qui fait "lol" sérieusement
Le boomer qui partage un complot
Le pinterest mom qui range
Le content creator burnout
Le youtuber clickbait qui prend la pose
Le tiktoker GRWM
Le tiktoker get unready
Le commenter "Mais à quel point tho"
Le commenter "Cest pour quand le grec"
Le commenter "Le saviez-vous"
Le BookTok crying break
Le wattpad teen qui pleure
Le isekai protagonist qui se réveille au lit
Le "I'm in this photo and don't like it"
Le anti-hero arc en marche silencieuse
Le villain origin arc avec sourire mauvais
Le glow down forced
Le glow up speedrun en mode "you weren't ready"
Le quiet luxury en beige
Le quiet quitting en mode bureau
Le boss girl en costume
Le girlbossing à la Sheryl Sandberg
Le simping intense pour un VTuber
Le parasocial fan d'un streamer
Le bookgift unboxing
Le tech unboxing slow
Le ASMR mukbang qui crunch
Le ASMR roleplay
Le ear cleaning ASMR
Le whispered ASMR proche du micro
Le mock the spotify wrapped
Le mock the apple replay
Le wrapped 2025 cringe
Le instagram private story chaos
Le close friends shade
Le finsta deranged
Le BeReal exposed
Le screenshot leak d'un groupe
Le caption italics dramatique
Le caption lyric sad
Le "soft launch" boyfriend en sweat noir
Le hard launch shoot en couple
Le insta story "to be continued"
Le insta story poll passive-aggressive
Le insta story question box deranged
Le insta dump end of month
Le snapchat memories trauma
Le facebook memories cringe
Le LinkedIn osé qui s'humble brag
Le LinkedIn humble brag spirituel
Le LinkedIn confession en réunion
Le LinkedIn "I'm thrilled to announce"
Le LinkedIn shooting devant un mur jaune
Le crypto bro qui pump and dump
Le NFT bro qui flex un jpeg
Le anti-NFT qui s'énerve
Le AI bro qui prompt "ChatGPT"
Le AI doomer qui s'inquiète
Le AI optimist qui delire
Le main character apology en mode larmes
Le influencer apology vidéo
Le manager appel post-canceling
Le agent d'influenceur dépassé
Le brain rot speedrun de 2h
Le "touch grass" qu'on dit à un ami
Le "log off" qu'on dit à soi-même
Le doomscroll sur le canapé
Le doomscroll dans son lit en pleine nuit
Le morning brain rot 15min
Le main character soirée vide
Le NPC walking dans le métro
Le NPC dialogue "Have a nice day"
Le Skibidi Toilet headbang
Le Hawk Tuah au micro
Le Ohio behavior en bus
Le mewing à table
Le erm acshually à un débat
Le ratio à un tweet politique
Le "this aged like milk" sur un vieux tweet
Le "main character energy" en marchant
Le glow up moment fitness
Le glow down moment lendemain
`);

const HORREUR_CURSED = lines(`
Un fantôme qui passe à travers un mur
Un vampire qui boit du jus de tomate
Une momie qui se déballe
Un zombie qui sort du sol
Un loup-garou qui se transforme à la pleine lune
Un démon qui sort d'un placard
Un possédé qui change de voix
Une poupée hantée qui tourne la tête
Une voix off cauchemardesque
Un appel d'urgence cassé
Une porte qui s'ouvre toute seule
Un fauteuil à bascule qui bouge sans personne
Un robinet qui coule de sang
Un miroir qui montre quelqu'un derrière
Une voiture qui démarre toute seule
Un piano qui joue tout seul
Une horloge qui s'arrête à 3h33
Un téléphone qui sonne dans le placard
Une lumière qui clignote dans la cave
Un cri d'enfant dans la forêt
Une masque qui parle
Une marionnette qui rit sans personne
Une statue de cire qui cligne
Une mariée morte qui valse
Un croque-mort qui sourit
Un fossoyeur qui creuse
Un cortège funèbre qui s'arrête net
Un cercueil qui s'ouvre lentement
Un cimetière brumeux à minuit
Un hôpital abandonné qui grince
Un manoir hanté qui pleure
Un parc d'attraction abandonné
Un asile psychiatrique en ruine
Une école désaffectée avec voix d'enfants
Un château fort cursed
Un lavabo qui crache du sang
Une douche qui marche toute seule
Un rideau qui bouge sans vent
Une nounou démoniaque
Un clown effrayant qui tient un ballon
Un mime devenu fou
Un chasseur de fantômes ridicule
Un exorciste fatigué
Un fossoyeur enrhumé
Un médium qui ronfle au milieu d'une séance
Une voyante qui voit un boomer dans ta tasse
Un cinéma de minuit avec un seul spectateur
Une bibliothèque qui se déplace
Un livre maudit qui s'ouvre
Une page qui se tourne toute seule
Une plume qui écrit toute seule
Un tableau dont les yeux suivent
Un buste antique qui parle
Une armure qui marche
Un train fantôme qui passe
Un wagon de métro vide à 3h
Un ascenseur qui descend au sous-sol
Une cabine téléphonique qui sonne
Un parking déserté avec une seule voiture
Un trottoir qui craque sous tes pieds
Un nuage en forme de tête
Un orage qui éclate dans le salon
Un éclair qui frappe à la fenêtre
Un tonnerre qui répond à un mot
Une chouette qui se moque
Un corbeau qui parle latin
Une chauve-souris qui scrute
Une grenouille qui ricane
Un crapaud qui regarde dans tes yeux
Un poisson rouge cursed
Un chat noir qui te suit jusque chez toi
Un chien à trois têtes qui te bloque
Un crocodile dans la baignoire
Une mygale qui tombe du plafond
Une centaine d'insectes qui sortent d'un placard
Une chenille qui devient papillon dément
Une fourmi géante qui parle
Un homme-papillon qui se pose
Un mothman dans la forêt
Un wendigo qui rampe
Un Slenderman qui se penche
Un Jeff the Killer qui sourit
Une Smile Dog qui rit
Une Momo Challenge qui appelle
Un Backrooms entity dans un couloir jaune
Une SCP qui suit chaque mouvement
Un manequin qui bouge quand tu détournes les yeux
Un manequin qui te suit dans IKEA
Une poupée Annabelle qui sourit
Une poupée Chucky qui court
Un personnage de jeu vidéo qui sort de l'écran
Un PNJ qui regarde droit la caméra
Un PNJ qui répète tes propres mots
Un cauchemar lucide
Une paralysie du sommeil avec ombre
Une visite chez le dentiste sans anesthésie
Une opération du genou en direct
Une autopsie publique
Une scène de Saw où le téléphone sonne
Une scène de Final Destination
Une vague qui s'élève d'un lac
Un esprit qui possède un grille-pain
Un possédé qui mange une banane
Un fantôme qui tente d'utiliser un iPhone
Une malédiction qui rate
Un sort raté qui se retourne
Un démon qui demande poliment
Un loup-garou qui se loupe
Un vampire qui n'aime pas l'ail
Un fantôme qui fait du yoga
Un zombie qui veut juste un câlin
Un mort-vivant amoureux
Un esprit frappeur qui frappe à côté
Une ouija board qui répond "non"
`);

const ABSURDE_WTF = lines(`
Un poisson qui pilote un avion
Un grille-pain qui se met en colère
Une banane qui parle russe
Un nuage qui prend l'apéro
Une chaussette amoureuse d'un radiateur
Une licorne qui paye ses impôts
Un dinosaure qui scrolle TikTok
Une vache qui présente la météo
Un crocodile qui passe son code de la route
Un yeti qui dépose un CV
Une grenouille qui négocie une augmentation
Un caméléon dans une fête sur fond blanc
Un mannequin de vitrine qui s'évade
Un crash test dummy qui pleure
Un robot aspirateur qui rêve
Une statue de la liberté qui éternue
Une Tour Eiffel qui tousse
Un sapin de Noël qui démissionne
Une bougie qui boude
Une casserole qui rumine
Une fourchette amoureuse d'une cuillère
Un sandwich qui prend la pose pour la story
Un yaourt expirant qui menace
Une pomme blasée par la gravité
Une orange qui s'évade d'un panier
Un avocat qui fait un TED Talk
Un kiwi qui critique un livre
Une fraise au festival d'Avignon
Une noix de coco qui plonge en parachute
Un cactus déprimé
Un cactus qui veut un câlin
Une plante carnivore qui régime
Une plante d'appart qui se déplace de pièce en pièce
Une mousse de bain qui s'enfuit
Un savon qui chante du gospel
Un shampooing en pleine crise existentielle
Une serviette qui prie
Un tapis qui plane
Un canapé qui voyage dans l'espace
Une table basse en quête d'amour
Une étagère IKEA qui se rebelle
Une lampe Pixar qui boude
Un ventilateur qui rappe
Un radiateur diva
Une climatisation qui rumine ses pertes
Une fenêtre qui se croit cinéma
Une porte qui hésite
Un rideau qui flotte tout seul
Une moquette qui se déroule
Une douche qui chante du Garou
Une baignoire qui s'évapore
Un évier qui aboie
Un robinet qui dit des secrets
Un parapluie qui s'envole avec son humain
Une botte qui se transforme en sneakers
Un parka qui flirte avec un manteau
Un t-shirt qui mute en chemise
Un jean qui devient short malgré lui
Une casquette qui se croit chapeau melon
Une écharpe qui ouvre un compte LinkedIn
Une cravate qui sort en boîte
Un papier toilette qui devient guirlande
Une serpillière qui veut être DJ
Un balai qui veut faire le mannequin
Un seau qui veut être pot de fleur
Une pelle qui creuse vers le ciel
Une râpe à fromage en quête d'amour
Une fourchette à fondue qui se sent seule
Une caquelon qui veut visiter Paris
Un grille-pain qui veut être four
Un four qui veut être micro-ondes
Un micro-ondes qui veut être astronaute
Un astronaute qui veut être fleuriste
Un fleuriste qui veut devenir pirate
Un pirate qui veut devenir comptable
Un comptable qui se rêve rockstar
Un rockstar qui se rêve gardien de phare
Un gardien de phare qui rêve d'être influenceur
Un influenceur qui rêve d'être moine
Un moine qui rêve d'être disc-jockey
Un disc-jockey qui rêve d'être boulanger
Un boulanger qui rêve d'être pilote de F1
Un pilote de F1 qui rêve d'être paysan
Un paysan qui rêve d'être ambassadeur
Un ambassadeur qui rêve d'être TikTokeur
Un TikTokeur qui rêve d'être prof de philo
Un prof de philo qui rêve d'être hot dog
Un hot dog qui rêve d'être cordon bleu
Un cordon bleu qui rêve d'être croquette
Une croquette qui rêve d'être croissant
Un croissant qui rêve d'être croque-monsieur
Un croque-monsieur qui rêve d'être chef étoilé
Un chef étoilé qui rêve d'être livreur Uber
Un livreur Uber qui rêve d'être astronaute
Un astronaute qui rêve d'être barman
Un barman qui rêve d'être ours en peluche
Un ours en peluche qui rêve d'être professeur de mathématiques
Une calculatrice en pleine crise existentielle
Un stylo qui veut écrire un roman
Une gomme qui efface ses propres souvenirs
Un compas qui veut tourner en rond pour le fun
Un cahier vide qui se sent inutile
Une trousse en burn-out
Une chaise qui se déhanche
Une table de cuisine en grève
Un fauteuil qui veut faire du sport
Un canapé clic-clac dépressif
Une porte coulissante qui ne coulisse plus
Un balcon qui veut visiter le rez-de-chaussée
Une cheminée jalouse du chauffage central
Un parquet qui craque pour rien
Un mur peint qui veut un tatouage
Une affiche qui se décolle volontairement
Un poster Justin Bieber qui démissionne
Un calendrier qui refuse de passer en 2027
Un agenda qui réorganise les rendez-vous
Une montre qui veut prendre des vacances
Un réveil qui veut dormir
Un téléphone qui veut être muet
Un chargeur USB qui se rebelle
Une prise multiprise qui veut se reposer
Un câble qui s'emmêle exprès
Une box internet qui prend sa retraite
Un router wifi qui veut être DJ
Une imprimante qui veut être chanteuse
Un scanner qui veut être détective
Un appareil photo qui ne veut plus photographier
Une webcam qui veut un selfie
Un micro qui n'aime pas sa voix
Un haut-parleur qui crie dans le vide
Une enceinte qui chante en yodeling
Un casque audio qui veut écouter
Un disque dur qui rêve d'être nuage
Une clé USB qui veut être trousseau
Une carte SD qui veut un permis
Un câble HDMI qui devient câble ethernet
Un mode avion qui veut sortir en soirée
Un Bluetooth qui veut être Wi-Fi
Une 5G qui veut être 6G
Une icône iPhone qui veut être android
Un emoji 😂 qui veut être 🥲
Un emoji 🍕 qui veut être 🍔
Un emoji 🐱 qui veut être 🐶
Un GIF qui veut être vidéo
Un meme qui veut être art conceptuel
Une story qui veut être permanente
Un BeReal qui veut être instantané
Un commentaire qui veut être un post
Un like qui veut un dislike
Une notification qui veut être ignorée
Un mail qui veut être supprimé
Un onglet qui veut rester ouvert
Une page qui veut un signet
Un signet qui veut être page
Un navigateur qui veut être livre
Un livre qui veut être audiobook
Un audiobook qui veut chanter
Une chanson qui veut être muette
Un silence qui veut chanter
Un cri qui veut chuchoter
Un chuchotement qui veut hurler
Un hurlement qui veut faire la sieste
Une sieste qui veut courir
Une course qui veut s'arrêter
Une voiture qui rêve d'être vélo
Un vélo qui rêve d'être trottinette
Une trottinette qui rêve d'être planche à roulettes
Une planche à roulettes qui rêve d'être skate park
Un skate park qui rêve d'être centre commercial
`);

const BEAUF_FRANCE_PROFONDE = lines(`
Un tonton qui allume le BBQ avec trop d'essence
Une tata qui sert l'apéro à 11h du matin
Un papy qui ronfle après le rosé
Un cousin qui parle voitures non-stop
Un beau-frère qui critique le pastis
Un pote qui sort la pétanque dès l'apéro
Un grand-père qui sort une blague sur les belges
Un voisin qui tond à 8h du matin
Un voisin qui sort sa débroussailleuse à 7h
Un voisin qui aboie sur ses enfants
Un cousin de Marseille qui crie "wesh"
Un cousin du Nord qui chante Pierre Bachelet
Un voisin breton qui boit du chouchen
Un cousin du Sud-Ouest qui aime trop le canard
Un alsacien qui mange une choucroute
Un savoyard qui fait fondre du Beaufort
Un corse qui regarde la mer en silence
Un parisien qui se plaint de la province
Un campeur de Camargue en jogging-claquettes
Un campeur de Bretagne sous la pluie
Un camping-cariste qui se gare partout
Un retraité aux dunes du Pilat
Un retraité au PMU à 9h
Un retraité qui parie sur le 12
Un retraité qui critique la jeunesse
Un retraité qui dit "C'était mieux avant"
Un mec bourré devant un PMU
Un mec qui chante "Allez Allez Allez" au bar
Un mec qui crie "Wesh ! Et alors !"
Un mec qui regarde un match en buvant des canons
Un mec en marcel qui regarde TPMP
Un mec en chemise hawaïenne en BBQ
Un mec en short cargo qui marche en claquettes
Un mec en bermuda qui sort le rosé
Un mec en jogging Adidas qui fume
Un mec en survet Lacoste qui crâne
Un mec en survet PSG qui chante en boîte
Un mec en survet OM qui boude
Une mémé qui fait des bisous baveux
Une mémé qui pince ta joue
Une mémé qui sort sa galette des rois en juin
Une mémé qui apprend à utiliser WhatsApp
Une mémé qui appelle pour rien
Une mémé qui range le frigo "à sa façon"
Une mémé qui regarde "Les feux de l'amour"
Une mémé qui critique tes chaussures
Une mémé qui te bourre de nourriture
Une mémé qui parle de la guerre
Un gendre qui regarde Lapierre conduire
Un gendre fatigué d'écouter
Une belle-mère qui inspecte ton frigo
Une belle-mère qui critique tes rideaux
Une belle-mère qui te juge silencieusement
Une belle-soeur qui parle MLM
Une belle-soeur qui parle astrologie
Un beauf au tuning festival
Un beauf qui pose devant sa 206 tunée
Un beauf qui klaxonne en mariage
Un beauf qui boit une Heineken à 9h
Un beauf qui chante "On va gagner" devant la TV
Un beauf qui hurle un but
Un beauf qui regarde un PMU
Un beauf qui parie sur un cheval
Un beauf qui crie "OUAIS !" devant un score
Un campeur qui sort sa tireuse à bière
Un campeur qui sort la pétanque
Un campeur qui sort la guitare au feu
Un campeur qui sort le rosé tiède
Un campeur qui plante sa tente à minuit
Un campeur qui replie sa tente sous la pluie
Un grilladiste expert qui parle de braise
Un grilladiste qui crame ses saucisses
Un grilladiste qui crame ses merguez
Un grilladiste qui défend "sa" sauce barbecue
Un coupeur de viande au mariage en mode "le mâle alpha"
Une tonton à la pétanque qui pointe puis tire
Un grand-père qui distribue son gnôle
Un grand-père qui sort sa carafe de Pineau
Un grand-père qui sort sa bouteille d'Armagnac
Un grand-père qui sort sa réserve de Chartreuse
Une mémé qui sort son apéritif "Suze pas frais"
Un pêcheur qui ramène trois sardines en 5h
Un chasseur qui rentre bredouille
Un chasseur qui se vante d'un sanglier inexistant
Un chasseur qui te montre sa carabine
Un randonneur qui parle de ses chaussettes
Un cycliste qui se plaint du vent
Un coureur qui se vante de son chrono
Un footing du dimanche en pleine vague de chaleur
Un raid moto qui pétarade
Un raid 4x4 qui creuse une dune
Un trial bike qui saute des cailloux
Un karting qui freine trop tard
Un kart qui rentre dans un autre kart
Un mec qui chante Renaud "Dès que le vent soufflera"
Un mec qui chante Goldman "Aller plus haut"
Un mec qui chante Pagny "Caruso" en pleurs
Un mec qui chante Aznavour "Emmenez-moi"
Un mec qui chante Hallyday "L'envie"
Une chorale de fin de mariage en mode "On va s'aimer"
Un karaoké de mariage Goldman forcé
Un karaoké de mariage Florent Pagny
Un karaoké de mariage M.Pokora
Un karaoké de mariage Calogero
Un karaoké de mariage Lara Fabian
Un karaoké de mariage Patrick Bruel
Un karaoké de mariage Nostalgie
Un karaoké de mariage Mike Brant
Une grand-mère qui chante "Tombé du ciel"
Un grand-père qui chante "La complainte de l'heure de pointe"
Un beau-frère qui joue de la guitare douteuse
Un cousin qui sort la flûte traversière
Un cousin qui sort la guitare au feu de camp
Une cousine qui chante "Mistral gagnant"
Un cousin qui chante "Petit Papa Noël" en juillet
Un mariage thématique tropical
Un mariage thématique western
Un mariage thématique fluo
Un anniversaire surprise gênant
Un anniversaire 80 ans en EHPAD
Un anniversaire 18 ans en boîte
Un anniversaire 30 ans qui finit en larmes
Un baptême qui dégénère en bagarre
Une communion sage
Une crémaillère où on casse un verre
Un nouvel an où tout le monde s'endort
Un Noël où la dinde brûle
Un Noël où on oublie un cadeau
Un Pâques avec œufs cachés dans le jardin
Un 14 juillet bal des pompiers
Une fête de la musique sous la pluie
Un BBQ sous la pluie en mode "y'a pas que le soleil"
Un BBQ en pleine canicule
Un BBQ qui se transforme en raclette
Un apéro-fromages avec disputes sur le camembert
Un apéro-charcuterie avec saucisson en bouche
Un apéro-tartines avec rillettes du Mans
Une fondue qui se rate
Une raclette qui dégage trop d'odeur
Un baby-foot tendu en mode finale du monde
Un babyfoot avec un cousin tricheur
Un billard où tout le monde rate la queue
Un fléchettes au comptoir
Un belote qui finit en dispute
Un belote où "ça pue la triche"
Un tarot avec papy qui ronchonne
Un Uno qui finit en pleurs
Un Monopoly familial qui dure 5h
Une Wii Sports avec mémé qui swing
Une PS5 partagée avec frère relou
Un Karaoké Singstar familial gênant
Un Karaoké Just Dance Mamie en sueur
Un trampoline avec voisin curieux
Une piscine gonflable trouée
Un château gonflable à anniversaire
Un combat de cailloux dans la cour
Une partie de cache-cache à 30 ans
Un défi de plongeon à la piscine municipale
Un toboggan d'eau qui pique le maillot
Une chaise longue qui s'effondre
Une corde à linge qui s'effondre sous le poids
Une glacière qui fuit en plein soleil
Une bouée qui se dégonfle en pleine mer
Une planche de surf qui te claque
Un pédalo qui prend l'eau
Un bateau gonflable qui se renverse
Un cousin qui plonge mal et fait éclater le ventre
Un cousin qui shoote dans la table
Un cousin qui renverse la sangria
Un cousin qui mange tout le saucisson
Un cousin qui finit pied dans la pizza
Un cousin qui dort sur le canapé
Un cousin qui ronfle dans le couloir
`);

const PROMPTS_BY_CATEGORY: Record<MimeExpressionCategory, string[]> = {
  classique: CLASSIQUE,
  apero_18: APERO_18,
  imitations: IMITATIONS,
  animaux: ANIMAUX,
  chant_musique: CHANT_MUSIQUE,
  scenes: SCENES,
  internet_brainrot: INTERNET_BRAINROT,
  horreur_cursed: HORREUR_CURSED,
  absurde_wtf: ABSURDE_WTF,
  beauf_france_profonde: BEAUF_FRANCE_PROFONDE,
};

const CATEGORY_OFFSETS: Record<MimeExpressionCategory, number> = {
  classique: 0,
  apero_18: 1000,
  imitations: 2000,
  animaux: 3000,
  chant_musique: 4000,
  scenes: 5000,
  internet_brainrot: 6000,
  horreur_cursed: 7000,
  absurde_wtf: 8000,
  beauf_france_profonde: 9000,
};

function normalizeMimeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
}

const MULTI_MIME_EXPRESSIONS: MimeExpression[] = [
  // 2 mimeurs
  { id: 2001, category: "absurde_wtf", text: "Deux astronautes qui essaient de manger leur repas en apesanteur", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2002, category: "scenes", text: "Un coiffeur qui rate complètement la coupe et son client qui réalise le désastre", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2003, category: "beauf_france_profonde", text: "Deux vieux qui se disputent la même place dans le bus", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2004, category: "scenes", text: "Un dentiste sadique et un patient terrorisé", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2005, category: "scenes", text: "Deux surfeurs qui se partagent la même vague et se crashent", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2006, category: "scenes", text: "Un prof qui s'endort et l'élève qui en profite pour copier", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2007, category: "scenes", text: "Deux personnes coincées dans un ascenseur qui se bloquent", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2008, category: "scenes", text: "Un joueur de tennis et son coach qui lui donne des conseils catastrophiques", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2009, category: "absurde_wtf", text: "Deux voleurs qui essaient de voler la même chose au même moment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2010, category: "absurde_wtf", text: "Un maître nageur qui sauve quelqu'un qui ne voulait pas être sauvé", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2011, category: "imitations", text: "Deux cowboy qui se regardent en chien de faïence avant le duel", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2012, category: "scenes", text: "Un chef étoilé qui goûte la cuisine catastrophique d'un amateur", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2013, category: "scenes", text: "Deux personnes qui font semblant de ne pas se voir dans la rue alors qu'elles se sont croisées", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2014, category: "absurde_wtf", text: "Un patient et son médecin qui lui annonce une très mauvaise nouvelle avec le sourire", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2015, category: "imitations", text: "Deux ninjas qui essaient de se battre mais continuent de rater leurs coups", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2016, category: "scenes", text: "Un vendeur de voitures et un client qui négocie depuis 3 heures pour 50 centimes", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2017, category: "scenes", text: "Deux personnes qui portent un canapé dans les escaliers et ça se passe très mal", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2018, category: "absurde_wtf", text: "Un mime qui est contrarié par un autre mime qui l'imite en miroir", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2019, category: "scenes", text: "Deux catcheurs qui font semblant de se battre mais l'un se blesse vraiment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2020, category: "imitations", text: "Un magicien qui rate tous ses tours devant son assistant mortifié", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2021, category: "beauf_france_profonde", text: "Deux voisins qui se disputent la télécommande à travers le mur", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2022, category: "absurde_wtf", text: "Un plongeur qui remonte à la surface avec un poisson dans le masque et son binôme qui ne sait pas quoi faire", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2023, category: "internet_brainrot", text: "Deux robots qui tombent amoureux mais leurs bras n'arrivent pas à se toucher", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2024, category: "scenes", text: "Un touriste qui essaie de parler une langue étrangère et son interlocuteur qui fait semblant de comprendre", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2025, category: "absurde_wtf", text: "Deux chevaliers en armure qui essaient de s'asseoir à la même table", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2026, category: "scenes", text: "Un livreur et un chien ultra agressif qu'il doit éviter", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2027, category: "scenes", text: "Deux joueurs d'échecs qui deviennent de plus en plus tendus au fil de la partie", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2028, category: "scenes", text: "Un candidat à un entretien d'embauche qui arrive avec une tenue de plage et le recruteur qui essaie de rester professionnel", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2029, category: "internet_brainrot", text: "Deux zombies qui essaient de faire la queue au supermarché normalement", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2030, category: "scenes", text: "Un boxeur et son entraîneur qui lui donne des ordres contradictoires", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2031, category: "absurde_wtf", text: "Un pompier et une victime coincée dans un arbre qui refuse de descendre", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2032, category: "scenes", text: "Deux personnes qui se saluent de très loin sans savoir si l'autre les salue vraiment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2033, category: "absurde_wtf", text: "Un sculpteur et sa statue qui prend vie au mauvais moment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2034, category: "scenes", text: "Deux touristes qui se perdent dans IKEA et commencent à paniquer", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2035, category: "absurde_wtf", text: "Un dompteur de lions face à un lion qui ne lui obéit absolument pas", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2036, category: "beauf_france_profonde", text: "Deux personnes qui dorment dans le même lit de camping et ça se passe très mal", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2037, category: "scenes", text: "Un karatéka et son adversaire qui trichent tous les deux", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2038, category: "internet_brainrot", text: "Deux personnes qui jouent à Pierre-Feuille-Ciseaux mais qui ne se mettent jamais d'accord sur le comptage", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2039, category: "absurde_wtf", text: "Un parachutiste et l'instructeur qui réalise que le parachute est défectueux", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2040, category: "scenes", text: "Deux personnes en train de faire des abdos ensemble mais l'un abandonne immédiatement", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2041, category: "absurde_wtf", text: "Un pianiste et son page-turner qui tourne les pages trop vite ou trop lentement", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2042, category: "imitations", text: "Un rappeur qui performe et son hype man ultra excessif", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2043, category: "absurde_wtf", text: "Deux explorateurs polaires qui découvrent qu'ils ont oublié la nourriture", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2044, category: "scenes", text: "Un athlète olympique et son kiné qui le masse un peu trop fort", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2045, category: "scenes", text: "Deux personnes qui font la bise mais ne savent pas combien de fois", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2046, category: "imitations", text: "Un pirate et son perroquet qui répète tout ce qu'il dit au mauvais moment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2047, category: "scenes", text: "Deux personnes coincées dans une photo de mariage qui sourient depuis trop longtemps", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2048, category: "scenes", text: "Un cuisinier sushi et un client qui essaie de manger avec des baguettes pour la première fois", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2049, category: "scenes", text: "Deux gardiens de but face au même pénalty et aucun ne bouge", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2050, category: "scenes", text: "Un plombier qui fait pire en réparant et le propriétaire qui le regarde", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2051, category: "imitations", text: "Deux espions qui se croisent dans le même couloir et essaient de rester discrets", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2052, category: "internet_brainrot", text: "Un influenceur qui fait ses selfies et le passant qui entre dans tous les plans", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2053, category: "internet_brainrot", text: "Deux bébés pandas qui font leur premier pas ensemble et se crashent", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2054, category: "absurde_wtf", text: "Un mannequin de vitrine et un passant qui le prend en photo mais il bouge", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2055, category: "absurde_wtf", text: "Deux personnes qui voient le même fantôme en même temps et réagissent complètement différemment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2056, category: "imitations", text: "Un super-héros et son sidekick qui n'a absolument aucun pouvoir utile", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2057, category: "scenes", text: "Un arbitre de foot qui siffle tout et son joueur vedette qui pleure pour rien", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2058, category: "apero_18", text: "Deux personnes qui portent le même costume à une fête déguisée et se mesurent", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2059, category: "absurde_wtf", text: "Un hypnotiseur et son sujet qui fait exactement le contraire de ce qu'on lui demande", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2060, category: "scenes", text: "Deux personnes qui font du tandem mais pédalent dans des sens opposés", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2061, category: "imitations", text: "Un détective qui interroge un suspect qui répond à côté de toutes les questions", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2062, category: "absurde_wtf", text: "Deux personnes dans un bateau gonflable pris dans les rapides qui s'accrochent", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2063, category: "imitations", text: "Un jury de télé-réalité et un candidat qui chante affreusement mais est convaincu d'être bon", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2064, category: "scenes", text: "Deux personnes qui font du yoga ensemble mais l'une ne comprend rien aux positions", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2065, category: "internet_brainrot", text: "Un personnage de jeu vidéo et son joueur qui appuie sur tous les mauvais boutons", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2066, category: "absurde_wtf", text: "Deux agents secrets qui font le mort en même temps alors qu'ils doivent se reconnaître", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2067, category: "scenes", text: "Un vendeur de rue ultra insistant et un touriste qui essaie de s'enfuir poliment", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2068, category: "absurde_wtf", text: "Deux acrobates qui répètent leur numéro de cirque et ratent tout", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2069, category: "imitations", text: "Un monstre sous le lit et l'enfant qui descend chercher un verre d'eau la nuit", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  { id: 2070, category: "scenes", text: "Deux coureurs de fond qui doublent et doublent encore le même dernier kilomètre", mimePlayerCountMin: 2, mimePlayerCountMax: 2 },
  // 3 mimeurs
  { id: 3001, category: "apero_18", text: "Trois joueurs de Twister qui se retrouvent dans une position impossible", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3002, category: "chant_musique", text: "Un groupe de rock dont chaque membre joue un morceau différent en même temps", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3003, category: "scenes", text: "Trois personnes qui portent un meuble trop grand dans un couloir trop étroit", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3004, category: "scenes", text: "Trois touristes qui lisent la même carte à l'envers et partent dans trois directions différentes", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3005, category: "imitations", text: "Un jury de MasterChef face à un plat que personne ne veut goûter", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3006, category: "absurde_wtf", text: "Trois fantômes qui hantent la même maison et ne s'entendent pas", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3007, category: "scenes", text: "Un groupe de personnes coincées dans un photomaton qui ne fonctionne pas bien", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3008, category: "scenes", text: "Trois enfants qui brisent un vase de valeur et essaient de le reconstruire avant que maman revienne", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3009, category: "scenes", text: "Une équipe de paintball où chacun trahit les autres", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3010, category: "absurde_wtf", text: "Trois personnes coincées dans un canot de sauvetage qui prend l'eau", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3011, category: "scenes", text: "Un groupe de touristes qui suit un guide qui se perd dans son propre musée", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3012, category: "internet_brainrot", text: "Trois influenceurs qui essaient tous de filmer le même coucher de soleil et se bloquent", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3013, category: "imitations", text: "Une équipe de braqueurs qui réalise qu'ils ont braqué le mauvais bâtiment", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3014, category: "absurde_wtf", text: "Trois pirates sur un radeau qui découvrent qu'aucun ne sait nager", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3015, category: "absurde_wtf", text: "Un groupe de secouristes incompétents qui essaient de sauver quelqu'un qui va très bien", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3016, category: "apero_18", text: "Trois personnes qui jouent aux chaises musicales mais personne ne lâche sa chaise", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3017, category: "chant_musique", text: "Un trio de danseurs de ballet dont un est un débutant total", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3018, category: "scenes", text: "Trois alpinistes sur une paroi qui réalisent au milieu qu'ils ont le vertige", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3019, category: "internet_brainrot", text: "Un groupe de trois zombies qui font la queue devant un cerveau distributeur", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3020, category: "imitations", text: "Trois personnages de dessin animé qui essaient de traverser une autoroute", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3021, category: "apero_18", text: "Une équipe qui joue à Charades mais personne ne trouve et ça s'énerve", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3022, category: "internet_brainrot", text: "Trois personnes coincées dans un escape room avec des indices impossibles", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3023, category: "absurde_wtf", text: "Un groupe de trois astronautes qui flottent et s'accrochent les uns aux autres", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3024, category: "scenes", text: "Trois personnes dans un ascenseur qui tombe en panne avec de la musique de spa", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3025, category: "chant_musique", text: "Un trio de chanteurs d'opéra dont l'un n'est pas du tout en mesure", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3026, category: "beauf_france_profonde", text: "Trois personnes en train de faire une sieste en camping mais envahies par les insectes", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3027, category: "scenes", text: "Une équipe de handball dont le gardien marque dans son propre but deux fois de suite", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3028, category: "absurde_wtf", text: "Trois personnes qui font semblant d'être des statues dans un parc mais l'une éternue", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3029, category: "imitations", text: "Un groupe de survivants post-apocalyptiques qui trouvent une pizzeria ouverte", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3030, category: "absurde_wtf", text: "Trois chevaliers qui essaient de monter sur le même cheval", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3031, category: "imitations", text: "Un trio de gangsters qui réalise que leur voiture est bloquée dans un embouteillage après le braquage", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3032, category: "apero_18", text: "Trois personnes qui jouent au Jenga mais la table est bancale", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3033, category: "absurde_wtf", text: "Un médecin, une infirmière et un patient lors d'une opération qui dégénère", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3034, category: "absurde_wtf", text: "Trois personnes dans un canot pneumatique qui se disputent la seule pagaie", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3035, category: "absurde_wtf", text: "Un groupe de trois pompiers dont l'un a le vertige face à un immeuble de deux étages", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3036, category: "imitations", text: "Trois loups-garous qui essaient de se transformer mais la pleine lune est derrière un nuage", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3037, category: "imitations", text: "Une équipe de tournage de film d'action avec un réalisateur hystérique et deux acteurs fatigués", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3038, category: "internet_brainrot", text: "Trois robots qui font la fête pour la première fois sans comprendre les codes humains", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3039, category: "scenes", text: "Un groupe de randonneurs dont un décide de faire demi-tour au sommet", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3040, category: "imitations", text: "Trois concurrents d'une émission de cuisine qui découvrent qu'on leur a retiré le four", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3041, category: "scenes", text: "Un trio de danseurs de hula-hoop qui n'ont qu'un seul cerceau pour trois", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3042, category: "internet_brainrot", text: "Trois gamers qui jouent en coop mais deux d'entre eux s'accusent mutuellement de tricher", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3043, category: "scenes", text: "Un groupe de trois stagiaires qui déménagent les affaires du patron et cassent quelque chose d'important", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3044, category: "beauf_france_profonde", text: "Trois personnes dans une piscine gonflable trop petite en plein été", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3045, category: "imitations", text: "Un trio de détectives qui enquête sur un crime mais chacun a une théorie différente", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3046, category: "absurde_wtf", text: "Trois personnes coincées dans un canot de sauvetage et qui attendent des secours qui ne viennent pas", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3047, category: "apero_18", text: "Un groupe de trois participants à un concours de grimaces qui ne peuvent plus arrêter", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3048, category: "absurde_wtf", text: "Trois personnes qui font semblant d'avoir l'air normal dans un tableau de maître", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3049, category: "scenes", text: "Une équipe de trois pour déplacer un piano à queue dans des escaliers", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3050, category: "absurde_wtf", text: "Trois extraterrestres qui essaient d'imiter des humains dans un fast-food", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3051, category: "scenes", text: "Un trio de skaters qui rate la même rampe trois fois de suite en s'encourageant", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3052, category: "apero_18", text: "Trois croupiers de casino face à un joueur qui gagne toujours", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3053, category: "imitations", text: "Un trio d'espions qui essaient de traverser un musée blindé de lasers", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3054, category: "scenes", text: "Trois personnes qui partagent un seul imperméable sous une averse", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3055, category: "imitations", text: "Un groupe de trois figurants de film qui se retrouvent dans la scène principale par erreur", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3056, category: "scenes", text: "Trois pompistes d'un parking qui dirigent la même voiture dans trois directions différentes", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3057, category: "absurde_wtf", text: "Un trio de plongeurs qui découvrent un trésor mais se disputent pour l'avoir", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3058, category: "beauf_france_profonde", text: "Trois personnes dans un hamac fait pour une seule qui tentent de s'équilibrer", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3059, category: "scenes", text: "Une famille de trois en train de monter un meuble IKEA avec deux notices différentes", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3060, category: "absurde_wtf", text: "Trois ninjas qui essaient de se cacher dans un décor de plage en plein soleil", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3061, category: "apero_18", text: "Un groupe de trois qui joue à duck duck goose mais personne ne court assez vite", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3062, category: "internet_brainrot", text: "Trois personnes qui font une photo de groupe mais personne ne regarde dans le même sens", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3063, category: "scenes", text: "Un trio de cuisiniers qui font la même recette mais avec des ingrédients complètement différents", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3064, category: "scenes", text: "Trois pilotes de formule 1 dont la voiture n'est finalement qu'une trottinette", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3065, category: "beauf_france_profonde", text: "Un groupe de trois retraités qui font du breakdance pour épater les jeunes", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3066, category: "scenes", text: "Trois personnes dans une queue interminable qui commencent à devenir folles", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3067, category: "absurde_wtf", text: "Un trio de tailleurs qui habillent un mannequin mais ne sont pas d'accord sur le style", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3068, category: "apero_18", text: "Trois personnes qui font un karaoké mais ne connaissent aucune parole", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3069, category: "absurde_wtf", text: "Un groupe de trois naufragés qui construisent un radeau avec des objets improbables", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  { id: 3070, category: "scenes", text: "Trois personnes dans un sauna trop chaud dont chacune fait semblant que ça va", mimePlayerCountMin: 3, mimePlayerCountMax: 3 },
  // 4 mimeurs
  { id: 4001, category: "scenes", text: "Quatre personnes qui forment un bobsleigh humain dans un couloir", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4002, category: "scenes", text: "Une équipe de foot qui célèbre son but mais le but est annulé VAR et tout s'effondre", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4003, category: "imitations", text: "Les Avengers low-cost face à une menace qui s'avère être un pigeon", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4004, category: "chant_musique", text: "Quatre membres d'un groupe de danse qui ont chacun appris une chorégraphie différente", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4005, category: "scenes", text: "Un repas de famille de Noël qui dégénère en bataille rangée de honte", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4006, category: "scenes", text: "Quatre passagers d'une voiture qui se perdent et ne sont pas d'accord sur le GPS", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4007, category: "internet_brainrot", text: "Un gang de zombies au supermarché qui font leurs courses normalement", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4008, category: "beauf_france_profonde", text: "Une équipe de chantier qui monte un meuble de jardin avec une seule notice en japonais", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4009, category: "absurde_wtf", text: "Quatre passagers d'un avion qui rencontrent de violentes turbulences et réagissent tous différemment", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4010, category: "imitations", text: "Les quatre membres d'un boy-band qui font leur grand retour 20 ans après", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4011, category: "absurde_wtf", text: "Une équipe de quatre plongeurs qui découvrent un requin et décident chacun de nager dans un sens différent", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4012, category: "absurde_wtf", text: "Quatre gardiens de musée qui ne bougent plus depuis des heures et quelque chose d'imprévu arrive", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4013, category: "internet_brainrot", text: "Un groupe de quatre qui joue à Among Us en vrai et tout le monde accuse tout le monde", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4014, category: "beauf_france_profonde", text: "Quatre personnes coincées dans une tente de camping sous une tempête", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4015, category: "internet_brainrot", text: "Une équipe de robotique dont les robots prennent vie et les retournent la situation", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4016, category: "imitations", text: "Quatre concurrents de The Floor / Fort Boyard qui doivent traverser la même pièce piégée", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4017, category: "absurde_wtf", text: "Une équipe de quatre qui fait une cérémonie de remise de prix mais il n'y a aucun gagnant", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4018, category: "apero_18", text: "Quatre personnes qui font une escape room mais sont toutes allergiques au noir", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4019, category: "internet_brainrot", text: "Un groupe de quatre PNJ de jeu vidéo qui font les mêmes gestes en boucle", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4020, category: "beauf_france_profonde", text: "Quatre pompiers qui éteignent un barbecue qui s'est mis à brûler lors d'une fête de jardin", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4021, category: "imitations", text: "Une équipe de quatre qui reconstruit la scène du Titanic mais dans un jacuzzi", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4022, category: "internet_brainrot", text: "Quatre extraterrestres qui essaient de reproduire un flash mob humain qu'ils ont vu sur YouTube", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4023, category: "chant_musique", text: "Un orchestre de quatre musiciens dont personne ne joue le même morceau", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4024, category: "scenes", text: "Quatre touristes qui essaient de faire un selfie au sommet d'une montagne sans tomber", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4025, category: "scenes", text: "Une équipe de rugby qui fête une victoire mais le stade est vide", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4026, category: "internet_brainrot", text: "Quatre personnages de RPG qui ouvrent un coffre et y trouvent quelque chose de décevant", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4027, category: "internet_brainrot", text: "Un groupe de quatre influenceurs food qui mangent tous la même chose mais font des réactions totalement opposées", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4028, category: "scenes", text: "Quatre personnes dans un train à grande vitesse qui réalisent qu'elles sont dans le mauvais train", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4029, category: "absurde_wtf", text: "Une troupe de théâtre de quatre qui joue une pièce mais oublie le scénario en direct", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4030, category: "imitations", text: "Quatre gardes royaux qui essaient de ne pas rire devant quelque chose de très drôle", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4031, category: "imitations", text: "Un équipage de quatre pirates qui cherchent un trésor mais la carte n'est pas à l'endroit", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4032, category: "scenes", text: "Quatre personnes qui font un team building de bureau totalement humiliant", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4033, category: "apero_18", text: "Un groupe de quatre qui fait une conga line qui ne s'arrête plus même dans les endroits inappropriés", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4034, category: "absurde_wtf", text: "Quatre cavaliers de l'apocalypse qui arrivent mais il y a des travaux sur leur route", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4035, category: "absurde_wtf", text: "Une équipe de quatre qui construit une pyramide humaine et tout s'effondre au mauvais moment", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4036, category: "scenes", text: "Quatre personnes qui regardent le même match à la TV dans des équipes adverses", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4037, category: "imitations", text: "Un groupe de quatre qui refait la scène du Lion King avec 'La vie sauvage'", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4038, category: "absurde_wtf", text: "Quatre soldats qui font la relève de la garde mais tout se désynchronise", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4039, category: "scenes", text: "Une équipe de quatre qui joue au bowling mais personne ne sait lancer", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4040, category: "scenes", text: "Quatre personnes qui font du four-man luge et paniquent à l'approche du virage", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4041, category: "imitations", text: "Un jury des Grammy Awards qui annonce le mauvais gagnant et essaie de corriger en direct", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4042, category: "absurde_wtf", text: "Quatre personnes qui refont la Cène mais se disputent les places", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4043, category: "absurde_wtf", text: "Un groupe de quatre astronautes qui jouent au foot sur la Lune pour la première fois", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4044, category: "imitations", text: "Quatre candidats de Koh-Lanta qui construisent un abri mais chacun a une technique différente", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4045, category: "internet_brainrot", text: "Un groupe de quatre qui tente une chorégraphie TikTok tous ensemble et rate chaque transition", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4046, category: "scenes", text: "Quatre personnes qui font une sieste en avion mais l'une ronfle, l'une parle, l'une donne des coups de pied", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4047, category: "scenes", text: "Un groupe de quatre touristes qui font la queue pour monter sur la Tour Eiffel et commencent à jouer pour passer le temps", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4048, category: "absurde_wtf", text: "Quatre personnes coincées sur un radeau de fortune qui essaient d'équilibrer le poids", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4049, category: "internet_brainrot", text: "Un gang de Super Mario en train de récupérer des pièces dans un niveau difficile", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4050, category: "chant_musique", text: "Quatre membres d'une chorale qui chantent tous à des tempos différents et essaient de se recadrer", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4051, category: "absurde_wtf", text: "Un groupe de quatre qui fait une promenade en forêt mais rencontre quelque chose d'inattendu", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4052, category: "scenes", text: "Quatre collègues de travail qui font semblant de bosser pendant l'inspection du patron", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4053, category: "imitations", text: "Un groupe de quatre vampires qui essaient de prendre leur petit-déjeuner avant le lever du soleil", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4054, category: "apero_18", text: "Quatre personnes qui jouent à la chaise musicale mais il n'y a qu'une chaise pour quatre", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4055, category: "scenes", text: "Un groupe de quatre qui essaie de déplacer un réfrigérateur par des escaliers en colimaçon", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4056, category: "scenes", text: "Quatre visiteurs dans un musée d'art contemporain qui font semblant de comprendre une œuvre incompréhensible", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4057, category: "imitations", text: "Un équipage de quatre qui navigue dans un bateau pirate mais la boussole est cassée", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4058, category: "absurde_wtf", text: "Quatre personnes qui font un saut en parachute en tandem mais le parachute ne s'ouvre pas et ça continue quand même", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4059, category: "absurde_wtf", text: "Un groupe de quatre qui refait le débarquement de Normandie mais en slow-motion dans une piscine", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4060, category: "imitations", text: "Quatre concurrents de téléachat qui présentent chacun le même produit différemment", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4061, category: "scenes", text: "Un groupe de quatre qui pratique un sport inconnu avec des règles inventées à la volée", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4062, category: "absurde_wtf", text: "Quatre personnes dans un zoo qui ne savent plus distinguer les animaux des touristes", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4063, category: "scenes", text: "Un groupe de quatre who essaie de faire la ola dans une salle vide", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4064, category: "scenes", text: "Quatre membres d'une famille qui font une randonnée et se perdent dans leur propre jardin", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4065, category: "internet_brainrot", text: "Un groupe de quatre robots ménagers qui se révoltent pendant le nettoyage de printemps", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4066, category: "imitations", text: "Quatre personnes qui forment une chenille humaine pour passer sous une barrière laser", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4067, category: "imitations", text: "Un groupe de quatre qui reconstruit la scène du roi Lion mais personne ne veut être Simba", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4068, category: "absurde_wtf", text: "Quatre mannequins de vitrine qui gèrent l'arrivée d'un client qui ne comprend pas qu'ils sont des mannequins", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4069, category: "imitations", text: "Un groupe de quatre Minions qui essaient de faire la cuisine pour Gru", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
  { id: 4070, category: "apero_18", text: "Quatre personnes qui jouent au Pictionary mais aucun ne sait dessiner et tout le monde pense avoir raison", mimePlayerCountMin: 4, mimePlayerCountMax: 4 },
];

export const MIME_EXPRESSIONS: MimeExpression[] = (() => {
  const seen = new Set<string>();
  const out: MimeExpression[] = [];
  for (const category of MIME_EXPRESSION_CATEGORIES) {
    const offset = CATEGORY_OFFSETS[category.id] ?? 0;
    const prompts = PROMPTS_BY_CATEGORY[category.id] ?? [];
    let written = 0;
    for (let rawIndex = 0; rawIndex < prompts.length; rawIndex += 1) {
      const text = prompts[rawIndex];
      const key = normalizeMimeText(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: 30001 + offset + written,
        category: category.id,
        text,
        mimePlayerCountMin: 1,
        mimePlayerCountMax: 1,
      });
      written += 1;
    }
  }
  return [...out, ...MULTI_MIME_EXPRESSIONS];
})();

function lines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
