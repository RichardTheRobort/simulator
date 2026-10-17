# levraicalcul.fr

Le site de la chaîne YouTube **Le Vrai Calcul | Finance** : « Les grandes décisions d’argent, calculées pour de vrai. »

- **Tout se calcule dans le navigateur** (JavaScript). Aucun serveur, aucune donnée envoyée, aucun traceur.
- **Hébergement :** GitHub Pages (Settings > Pages > Deploy from a branch > `main`, dossier `/`), domaine `levraicalcul.fr` (fichier `CNAME`).
- **Polices** (Inter, Fraunces) hébergées dans `fonts/`, sous licence SIL Open Font License (voir les fichiers `LICENSE-*.txt`).

## Organisation

| Chemin | Rôle |
|---|---|
| `index.html`, `accueil.css` | La page d’accueil (liste des simulateurs) |
| `favicon.svg` | Le logo de la chaîne |
| `fonts/` | Les polices, partagées par toutes les pages |
| `acheter-ou-louer/` | Le simulateur de la vidéo 1 « Acheter ou louer après 40 ans : le vrai calcul » |

Un nouveau simulateur = un nouveau dossier (par exemple `rembourser-ou-investir/`) et une nouvelle carte sur la page d’accueil.

## Simulateur « Acheter ou louer après 40 ans »

Il compare le patrimoine à l’âge de la retraite dans deux cas : acheter son logement, ou rester locataire en plaçant la différence.

### À mettre à jour

Dans `acheter-ou-louer/simulateur.js`, en haut du fichier :

- `CONFIG.lienVideo` : l’adresse de la vidéo YouTube, quand elle sera en ligne (le lien apparaît alors en haut de la page) ;
- `CONFIG.formulaireEmail` : l’adresse (« action ») du formulaire Brevo ; l’encadré « Recevez la check-list » apparaît alors sous les résultats. Champ email + case séparée, non cochée, pour la lettre (attribut Brevo `NEWSLETTER`) ;
- `TAUX_MOYENS` et `JULIEN.taux` : les taux moyens par durée (Observatoire Crédit Logement/CSA), avec le mois dans l’aide de la case « Taux du crédit », la source dans `index.html` et la date en bas de page.

### Le calcul

Le même modèle que la vidéo, mois par mois :

- **Achat :** l’apport paie les frais d’achat et une partie du prix ; le reste est emprunté. L’acheteur paie mensualité, assurance (sur le capital emprunté), taxe foncière, charges et entretien. Patrimoine = valeur du logement − capital restant dû + ce qu’il a placé les mois où il payait moins que le loyer.
- **Location :** l’apport est placé dès le départ ; chaque mois où l’acheteur paie plus que le loyer, le locataire place la différence.
- Loyers et dépenses augmentent chaque année du même pourcentage. Non comptés : frais de revente, impôts et frais sur les placements, aides.
- L’âge où l’achat passe devant est situé entre deux fins d’année par interpolation, comme le point sur le graphique.

Vérification : avec l’exemple de Julien (valeurs par défaut, taux de septembre 2026), on retrouve les chiffres de la vidéo : 347 115 € contre 255 756 € à 65 ans, croisement vers 48 ans.

Outils pédagogiques : ce n’est pas un conseil financier personnalisé.
