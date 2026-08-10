# GPT-5.6 Luna comme worker d'implementation borne

Date de verification : 2026-08-09

## Verdict

Oui : GPT-5.6 Luna est un bon candidat pour un worker d'implementation **etroitement borne**, auquel l'orchestrateur fournit les decisions, le perimetre, les fichiers attendus, les criteres de succes et les validations. Ce positionnement concorde avec celui d'OpenAI : Luna est le tier GPT-5.6 le plus rapide et le moins cher, destine aux charges sensibles au cout et a fort volume. Les benchmarks publics de lancement montrent une capacite de coding-agent suffisante pour de l'execution, tout en laissant un ecart net avec Sol sur les travaux qui demandent davantage de jugement.

En revanche, `max` n'est pas justifie comme valeur par defaut pour ce role. Pour un worker volontairement prive des decisions d'architecture et de produit, le meilleur point de depart officiel est `medium`, puis une comparaison mesuree avec `high` et `xhigh`. Si l'exigence humaine est explicitement « very high », la traduction technique correcte est bien `xhigh`. `max` doit rester un palier d'escalade pour quelques unites difficiles, apres mesure d'un gain de qualite qui compense la latence et les tokens supplementaires.

Le contrat recommande est donc : **Luna execute; l'orchestrateur decide, analyse, revoit et integre.** Une ambiguite non couverte par le paquet d'unite doit produire un arret et une remontee, pas une decision locale du worker.

## Ce que les sources etablissent

### Positionnement, capacite et limites utiles

OpenAI decrit `gpt-5.6-luna` comme le modele GPT-5.6 optimise pour les charges sensibles au cout et a fort volume, correspondant approximativement au tier `nano` des familles GPT-5 precedentes. Le modele accepte un contexte de 1 050 000 tokens, jusqu'a 128 000 tokens de sortie, les reasoning tokens, le function calling, les structured outputs et les outils necessaires a un agent de code. Cela valide l'usage comme executant outille; cela ne prouve pas qu'il doit recevoir de la conception ouverte. [Fiche officielle GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

Les resultats publies par OpenAI pour le coding donnent a Luna :

| Evaluation | Luna | Terra | Sol | GPT-5.5 |
|---|---:|---:|---:|---:|
| Artificial Analysis Coding Agent Index v1.1 | 74,6 | 77,4 | 80,0 | 76,4 |
| SWE-Bench Pro | 62,7 % | 63,4 % | 64,6 % | 59,4 % |
| DeepSWE v1.1 | 67,2 % | 69,6 % | 72,7 % | 67,0 % |
| Terminal-Bench 2.1 | 84,7 % | 87,4 % | 88,8 % | 85,6 % |

Ces chiffres montrent que Luna reste credible sur l'implementation et le terminal, mais qu'il ne domine pas systematiquement : il depasse GPT-5.5 sur SWE-Bench Pro et DeepSWE, et reste legerement derriere sur le Coding Agent Index et Terminal-Bench. Ils soutiennent un routage par difficulte, pas le remplacement universel des modeles plus puissants. [Annonce et tableaux d'evaluation GPT-5.6](https://openai.com/index/gpt-5-6/)

Sur l'Artificial Analysis Coding Agent Index, OpenAI indique aussi que Luna surpasse Opus 4.8 en environ un tiers du temps, avec environ deux fois moins de tokens de sortie et environ un quart du cout estime. C'est l'indice public le plus directement favorable au role de worker rapide. OpenAI precise toutefois que ses couts et latences sont estimes a partir du comportement de production puis simules hors ligne, avec la latence simulee au debit Fast API; les resultats reels peuvent varier fortement. Le tableau publie ne fournit pas une ablation Luna par niveau d'effort, donc il ne permet pas a lui seul de choisir `xhigh` ou `max`. [Annonce GPT-5.6 et methodologie](https://openai.com/index/gpt-5-6/)

### Vitesse

OpenAI presente Luna comme le membre le plus rapide de la famille, mais ne publie pas de debit absolu Luna en tokens/seconde ni de TTFT sur la fiche modele. Dans Codex, `Fast mode` annonce une vitesse 1,5x pour les modeles pris en charge, dont GPT-5.6, en consommant 2,5x les credits du mode standard. Avec une cle API, le multiplicateur de credits ChatGPT ne s'applique pas et le traitement API Fast est facture 2x le tarif standard. Ce n'est **pas** une garantie de bout en bout : le temps de raisonnement, les appels d'outils, les commandes, les tests et les files d'attente du harness s'ajoutent au debit de generation. [Documentation vitesse de Codex](https://learn.chatgpt.com/docs/agent-configuration/speed)

En pratique, le bon indicateur pour `ce-work` n'est donc pas seulement tokens/s, mais la duree entre dispatch et preuve locale validee, en comptant les reprises et escalades.

### Cout et tokens

Au tarif API standard consulte le 2026-08-09, Luna coute 0,20 USD par million de tokens d'entree, 0,02 USD en entree cachee, 0,25 USD en ecriture de cache et 1,20 USD par million de tokens de sortie en contexte court. Terra est affiche a 2,00 / 0,20 / 2,50 / 12,00 USD et Sol a 5,00 / 0,50 / 6,25 / 30,00 USD : Luna coute donc dix fois moins que Terra et vingt-cinq fois moins que Sol sur l'entree et la sortie standard a volume identique. Au-dela de 272 000 tokens d'entree, toute la requete Luna est facturee a 2x pour l'entree et 1,5x pour la sortie; un paquet d'unite compact evite donc aussi un palier tarifaire. [Fiche officielle GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [tarification officielle](https://developers.openai.com/api/docs/pricing)

Le contexte long Luna est affiche a 0,40 USD entree, 0,04 USD entree cachee, 0,50 USD en ecriture de cache et 1,80 USD sortie. En API Fast, ces tarifs doublent encore. Cette grille API ne constitue pas une estimation directe du cout d'un run Codex CLI authentifie par abonnement, qui consomme des credits selon sa propre grille. [Tarification officielle](https://developers.openai.com/api/docs/pricing), [documentation vitesse de Codex](https://learn.chatgpt.com/docs/agent-configuration/speed)

OpenAI affirme que GPT-5.6 produit davantage de travail par token, mais ne publie pas d'ablation Luna `high` contre `xhigh` contre `max` pour un paquet d'implementation comparable a celui de `ce-work`. Il faut donc mesurer les tokens du harness reel plutot que deduire la consommation du seul nom du palier.

### `high`, `xhigh` ou `max`

GPT-5.6 supporte `none`, `low`, `medium`, `high`, `xhigh` et `max`. Le guide officiel recommande :

- `medium` comme point de depart equilibre et `low` pour les charges sensibles a la latence;
- `high` ou `xhigh` uniquement lorsque davantage de raisonnement procure un gain de qualite mesure;
- `max` pour les workloads les plus difficiles ou la qualite prime, en comparant explicitement `max` et `xhigh` sur des taches representatives.

Le guide conseille egalement, lors d'une migration, de tester le palier actuel **et un palier plus bas**, car GPT-5.6 peut maintenir la qualite avec moins de tokens. [Guide officiel GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)

Application au worker borne :

| Palier | Usage recommande |
|---|---|
| `medium` | Baseline cout/latence a inclure dans l'evaluation; possible pour les modifications tres mecaniques. |
| `high` | Palier suivant si les evals montrent que `medium` cause trop d'echecs ou de reprises. |
| `xhigh` | Traduction correcte d'une demande explicite « very high »; a conserver seulement si l'eval montre moins d'echecs, de reprises ou de corrections. |
| `max` | Escalade exceptionnelle, pas defaut du worker rapide; si l'unite exige regulierement ce palier, Terra ou Sol peut offrir un meilleur cout par succes. |

### Adoption : ce qui est public et ce qui ne l'est pas

OpenAI rend Luna disponible dans Codex et l'API et cite des evaluations de partenaires sur la famille GPT-5.6. Notion dit publiquement que Terra et Luna offrent beaucoup de capacite pour leur prix; Cognition decrit GPT-5.6 comme tres efficace pour des agents de code en production. Ces temoignages confirment un interet reel pour la famille, mais ils ne publient ni volume d'utilisation Luna, ni taux de succes Luna, ni distribution des paliers de raisonnement. [Temoignages de partenaires dans l'annonce GPT-5.6](https://openai.com/index/gpt-5-6/)

Je n'ai trouve aucune telemetrie publique primaire permettant d'affirmer que « les gens utilisent Luna a `max` » ni de benchmark public first-party isolant Luna `xhigh` et Luna `max` sur des workers d'implementation bornes. Les publications communautaires peuvent servir a formuler des hypotheses, mais pas a choisir le defaut sans reproduction locale.

## Correspondance avec le contrat `ce-work`

Le contrat local va dans la bonne direction : le worker d'implementation recoit un paquet d'unite borne, ne doit pas elargir son autorite et remonte `scope_expansion` lorsque le travail correct sortirait du perimetre. Le controleur conserve l'etat durable, l'integration, les decisions et la verification autoritative. Voir `skills/ce-work/references/agents/implementation-worker.md` et `skills/ce-work/references/cross-model-execution.md`.

Pour correspondre exactement au role « ouvrier rapide, pas architecte », le paquet Luna doit contenir :

1. une seule unite deja tranchee, avec dependances satisfaites;
2. les fichiers attendus et les limites explicites;
3. les comportements et criteres d'acceptation observables;
4. les tests/commandes de validation cibles;
5. une instruction d'escalade sur ambiguite, contradiction ou extension de scope;
6. aucune question produit, aucun choix d'architecture et aucun mandat d'integration.

Les modeles plus puissants gardent la decomposition, les arbitrages, l'analyse des echecs, la revue du diff, l'integration et la validation finale. Cette separation est egalement coherente avec la recommandation generale d'OpenAI de definir les contraintes, les limites d'approbation et les criteres de succes, et d'indiquer quelles ambiguites doivent declencher une question. [Guide officiel GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)

## Evaluation locale recommandee

Avant de figer `xhigh`, executer un petit A/B sur des unites representatives et rejouer chaque cellule plusieurs fois :

| Cellule | Modele/effort |
|---|---|
| A | Luna `medium` |
| B | Luna `high` |
| C | Luna `xhigh` |
| D | Luna `max`, uniquement sur les unites difficiles |
| E | Terra `high`, comme controle de cout par succes |

Mesurer par unite : succes du premier coup, tests cibles passes, corrections imposees par la revue, extensions de scope, escalades valides, duree totale, tokens d'entree/cache/reasoning/sortie, cout, et temps humain de reprise. Le critere de choix doit etre le **cout et le temps par unite acceptee**, pas le prix/token ni un score de benchmark seul.

Decision proposee : garder la possibilite de demander explicitement Luna `xhigh`, ne pas utiliser `max` par defaut, et evaluer `medium` comme candidat de base contre le `xhigh` explicitement demande. Les receipts `ce-work` doivent ensuite dire si `xhigh` reduit suffisamment les reprises pour compenser son cout et sa latence.
