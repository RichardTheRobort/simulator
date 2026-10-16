# Simulateur « Acheter ou louer après 40 ans »

Le simulateur qui accompagne la vidéo « Acheter ou louer après 40 ans : le vrai calcul ».
Il compare le patrimoine à l'âge de la retraite dans deux cas : acheter son logement, ou rester locataire en plaçant la différence.

- **Tout se calcule dans le navigateur** (JavaScript). Aucun serveur, aucune donnée envoyée, aucun traceur.
- **Hébergement :** GitHub Pages (Settings > Pages > Deploy from a branch > `main`, dossier `/`).
- Les polices (Inter, Fraunces pour le titre) sont hébergées dans `fonts/`, sous licence SIL Open Font License (voir les fichiers `LICENSE-*.txt`).

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page |
| `style.css` | L'interface (couleurs de la chaîne) |
| `simulateur.js` | Le calcul, le graphique et le tableau |

## À mettre à jour

Dans `simulateur.js`, en haut du fichier :

- `CONFIG.lienVideo` : l'adresse de la vidéo YouTube, quand elle sera en ligne (le lien apparaît alors en haut de la page) ;
- `CONFIG.lienNewsletter` : la page d'inscription à la newsletter (le bloc « Recevez le tableau détaillé » apparaît alors) ;
- `TAUX_MOYENS` : les taux moyens par durée (Observatoire Crédit Logement/CSA), à mettre à jour chaque mois ou chaque trimestre, ainsi que la date en bas de `index.html`.

## Le calcul

Le même modèle que la vidéo, mois par mois :

- **Achat :** l'apport paie les frais d'achat et une partie du prix ; le reste est emprunté. L'acheteur paie mensualité, assurance (sur le capital emprunté), taxe foncière, charges et entretien. Patrimoine = valeur du logement − capital restant dû + ce qu'il a placé les mois où il payait moins que le loyer.
- **Location :** l'apport est placé dès le départ ; chaque mois où l'acheteur paie plus que le loyer, le locataire place la différence.
- Loyers et dépenses augmentent chaque année du même pourcentage. Non comptés : frais de revente, impôts et frais sur les placements, aides.

Vérification : avec l'exemple de Julien (valeurs par défaut), on retrouve les chiffres de la vidéo : 349 197 € contre 252 194 € à 65 ans, croisement à 48 ans.

Outil pédagogique : ce n'est pas un conseil financier personnalisé.
