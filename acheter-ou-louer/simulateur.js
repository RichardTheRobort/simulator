/* Simulateur « Acheter ou louer après 40 ans ».
   Tout le calcul se fait dans le navigateur : aucune donnée n'est envoyée.
   Même modèle que la vidéo 1 (calcul mois par mois, de l'âge actuel à l'âge de la retraite). */
'use strict';

/* ---------- Réglages à compléter plus tard ---------- */
const CONFIG = {
  lienVideo: '',       // adresse de la vidéo YouTube, quand elle sera en ligne
  formulaireEmail: '' // adresse du formulaire Brevo (« action » du formulaire intégré), quand le compte existera
};

/* Taux moyens des crédits immobiliers par durée (taux fixes, hors assurance).
   Source : Observatoire Crédit Logement/CSA, septembre 2026 (publié le 30/09/2026). */
const TAUX_MOYENS = { 15: 3.21, 20: 3.39, 25: 3.45 };

/* L'exemple de Julien (exemple fictif de la vidéo). */
const JULIEN = {
  age: 42, ageFin: 65, loyer: 1050, revenu: 3600,
  prix: 250000, apport: 68750, duree: 25, taux: 3.45,
  hausseImmo: 1.5, rendement: 5,
  frais: 7.5, assurance: 0.35, taxeFonciere: 1100, charges: 1500, hausseLoyers: 2
};

/* Les cases : bornes acceptées, curseur [min, max, pas], format, aide éventuelle. */
const CHAMPS = [
  { id: 'age', groupe: 'base', label: 'Votre âge', unite: 'ans', min: 18, max: 80, curseur: [25, 70, 1], fmt: 'entier' },
  { id: 'ageFin', groupe: 'base', label: 'Âge de la retraite', unite: 'ans', min: 19, max: 90, curseur: [55, 75, 1], fmt: 'entier' },
  { id: 'loyer', groupe: 'base', label: 'Loyer actuel, hors charges', unite: '€/mois', min: 0, max: 20000, curseur: [300, 3000, 10], fmt: 'euros' },
  { id: 'prix', groupe: 'base', label: 'Prix du logement', unite: '€', min: 10000, max: 10000000, curseur: [50000, 1000000, 5000], fmt: 'euros' },
  { id: 'apport', groupe: 'base', label: 'Votre apport', unite: '€', min: 0, max: 10000000, curseur: [0, 500000, 1000], fmt: 'euros' },
  { id: 'taux', groupe: 'credit', label: 'Taux du crédit', unite: '%/an', min: 0, max: 15, curseur: [0.5, 6, 0.01], fmt: 'pourcent', indice: 'Taux moyen pour cette durée en septembre 2026. Mettez celui de votre banque si vous l’avez.' },
  { id: 'hausseImmo', groupe: 'decisif', label: 'Évolution du prix du logement', unite: '%/an', min: -10, max: 15, curseur: [-3, 5, 0.1], fmt: 'pourcent', indice: 'Repère : −0,8 % sur un an pour l’ancien (Insee, 2e trimestre 2026).' },
  { id: 'rendement', groupe: 'decisif', label: 'Rendement de vos placements', unite: '%/an', min: -10, max: 20, curseur: [0, 10, 0.1], fmt: 'pourcent', indice: 'Repère : 6,67 % par an depuis 2000 pour l’indice mondial MSCI World, avec une chute de 53,6 % entre 2001 et 2009.' },
  { id: 'revenu', groupe: 'affiner', label: 'Vos revenus nets', unite: '€/mois', min: 0, max: 200000, curseur: [0, 15000, 50], fmt: 'euros', facultatif: true, indice: 'Pour la règle des 35 % des banques. Laissez vide pour l’ignorer.' },
  { id: 'frais', groupe: 'affiner', label: 'Frais d’achat', unite: '%', min: 0, max: 20, curseur: [0, 10, 0.1], fmt: 'pourcent', indice: '7 à 8 % du prix dans l’ancien, 2 à 3 % dans le neuf.' },
  { id: 'assurance', groupe: 'affiner', label: 'Assurance du crédit', unite: '%/an', min: 0, max: 3, curseur: [0, 1, 0.01], fmt: 'pourcent', indice: 'En % du montant emprunté.' },
  { id: 'taxeFonciere', groupe: 'affiner', label: 'Taxe foncière', unite: '€/an', min: 0, max: 50000, curseur: [0, 5000, 50], fmt: 'euros' },
  { id: 'charges', groupe: 'affiner', label: 'Charges et entretien', unite: '€/an', min: 0, max: 100000, curseur: [0, 8000, 100], fmt: 'euros', indice: 'Seulement ce qu’un locataire ne paierait pas.' },
  { id: 'hausseLoyers', groupe: 'affiner', label: 'Hausse des loyers et des dépenses', unite: '%/an', min: -5, max: 15, curseur: [0, 5, 0.1], fmt: 'pourcent' }
];
const PAR_ID = Object.fromEntries(CHAMPS.map(c => [c.id, c]));

/* ---------- Formats ---------- */
/* Espace insécable normale pour les milliers : l'espace fine est presque invisible en petit corps. */
const formateur = options => { const f = new Intl.NumberFormat('fr-FR', options); return { format: v => f.format(v).replace(/ /g, ' ') }; };
const NB0 = formateur({ maximumFractionDigits: 0 });
const NB2 = formateur({ maximumFractionDigits: 2 });
const NB1 = formateur({ minimumFractionDigits: 0, maximumFractionDigits: 1 });
const euros = v => NB0.format(Math.round(v)) + ' €';
const milliers = v => euros(Math.round(v / 1000) * 1000);
const pourcent = (v, f = NB1) => f.format(v) + ' %';
function kEuros(v) {
  if (Math.abs(v) >= 1e6) return NB1.format(v / 1e6) + ' M€';
  if (v === 0) return '0';
  return NB0.format(v / 1000) + ' k€';
}
function lire(texte) {
  const t = String(texte).replace(/[\s  €%]/g, '').replace(',', '.').replace(/[−–]/g, '-');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
function ecrire(id, v) {
  if (v === null || v === undefined) return '';
  return PAR_ID[id].fmt === 'pourcent' ? NB2.format(v) : NB0.format(v);
}

/* ---------- Le modèle ---------- */
function mensualite(capital, tauxAnnuel, ans) {
  if (capital <= 0) return 0;
  const r = tauxAnnuel / 12, n = ans * 12;
  return r === 0 ? capital / n : capital * r / (1 - Math.pow(1 + r, -n));
}

function simuler(p, hausseImmo = p.hausseImmo) {
  const t = p.taux / 100, immo = hausseImmo / 100, infl = p.hausseLoyers / 100, rend = p.rendement / 100;
  const coutTotal = p.prix * (1 + p.frais / 100);
  const pret = Math.max(0, coutTotal - p.apport);
  const reste = Math.max(0, p.apport - coutTotal);       // apport non utilisé si tout est payé comptant
  const m = mensualite(pret, t, p.duree);
  const assurMois = pret * (p.assurance / 100) / 12;      // contrat de banque : sur le capital emprunté
  const r = t / 12, rm = Math.pow(1 + rend, 1 / 12) - 1;
  const mois = Math.round((p.ageFin - p.age) * 12);
  let crd = pret, placeLoc = p.apport, placeAchat = reste;
  const annees = [{ age: p.age, A: p.prix - pret + reste, B: p.apport, crd: pret }];
  for (let k = 0; k < mois; k++) {
    const f = Math.pow(1 + infl, Math.floor(k / 12));
    const loyer = p.loyer * f;
    let coutAchat = (p.taxeFonciere + p.charges) * f / 12;
    if (pret > 0 && k < p.duree * 12) {
      const interet = crd * r;
      crd -= (m - interet);
      coutAchat += m + assurMois;
    }
    placeLoc *= 1 + rm;
    placeAchat *= 1 + rm;
    const diff = coutAchat - loyer;
    if (diff > 0) placeLoc += diff;      // le locataire place ce que l'acheteur paie en plus
    else placeAchat -= diff;             // l'acheteur place ce qu'il paie en moins
    if ((k + 1) % 12 === 0 || k === mois - 1) {
      const valeur = p.prix * Math.pow(1 + immo, (k + 1) / 12);
      const du = Math.max(crd, 0);
      annees.push({ age: p.age + (k + 1) / 12, A: valeur - du + placeAchat, B: placeLoc, crd: du, valeur, placeAchat });
    }
  }
  const fin = annees[annees.length - 1];
  return {
    annees, pret, m, assurMois,
    fraisAchat: p.prix * p.frais / 100,
    interets: m * p.duree * 12 - pret,
    finCredit: p.age + p.duree,
    crdFin: fin.crd, A: fin.A, B: fin.B,
    loyerFin: p.loyer * Math.pow(1 + infl, p.ageFin - p.age)
  };
}

/* Âge (arrondi) où l'achat passe devant pour de bon, ou null.
   Le croisement est situé entre deux fins d'année par interpolation, comme sur le graphique. */
function croisement(annees) {
  const n = annees.length;
  if (annees[n - 1].A <= annees[n - 1].B) return null;
  let i = n - 1;
  while (i > 0 && annees[i - 1].A > annees[i - 1].B) i--;
  if (i === 0) return { age: annees[0].age, depart: true };
  const a = annees[i - 1], b = annees[i], d0 = a.A - a.B, d1 = b.A - b.B;
  const exact = a.age + (d0 / (d0 - d1)) * (b.age - a.age);
  return { age: Math.round(exact), exact, i };
}

/* Hausse annuelle des prix qui met l'achat et la location à égalité. */
function seuilImmo(p) {
  const ecart = x => { const s = simuler(p, x); return s.A - s.B; };
  let bas = -10, haut = 15;
  if (ecart(bas) >= 0) return { cas: 'toujours' };
  if (ecart(haut) < 0) return { cas: 'jamais' };
  for (let i = 0; i < 50; i++) { const mid = (bas + haut) / 2; if (ecart(mid) >= 0) haut = mid; else bas = mid; }
  return { cas: 'seuil', valeur: (bas + haut) / 2 };
}

/* ---------- La page ---------- */
const $ = id => document.getElementById(id);
let dernier = null;

function construireCases() {
  CHAMPS.forEach(c => {
    const aide = c.indice ? `<p class="indice" id="${c.id}-indice">${c.indice}</p>` : '';
    const [cmin, cmax, cpas] = c.curseur;
    const html = `<div class="ligne" id="ligne-${c.id}">
      <label for="${c.id}">${c.label}</label>
      <div class="valeur"><input id="${c.id}" name="${c.id}" inputmode="${c.fmt === 'entier' ? 'numeric' : 'decimal'}"${c.indice ? ` aria-describedby="${c.id}-indice"` : ''}><span class="unite">${c.unite}</span></div>
      <input type="range" id="${c.id}-curseur" min="${cmin}" max="${cmax}" step="${cpas}" aria-label="${c.label}">
      ${aide}<p class="erreur" id="${c.id}-erreur" hidden></p>
    </div>`;
    $('groupe-' + c.groupe).insertAdjacentHTML('beforeend', html);
  });
}

function placerCurseur(id, v) {
  const r = $(id + '-curseur'), c = PAR_ID[id];
  const [cmin, cmax] = c.curseur;
  const x = Math.min(cmax, Math.max(cmin, v ?? cmin));
  r.value = x;
  r.style.setProperty('--p', ((x - cmin) / (cmax - cmin) * 100) + '%');
}

function remplir(valeurs) {
  CHAMPS.forEach(c => { $(c.id).value = ecrire(c.id, valeurs[c.id]); placerCurseur(c.id, valeurs[c.id]); montrerErreur(c.id, ''); });
  document.querySelectorAll('input[name="duree"]').forEach(r => { r.checked = Number(r.value) === valeurs.duree; });
}

function montrerErreur(id, texte) {
  const e = $(id + '-erreur');
  e.textContent = texte; e.hidden = !texte;
  const input = $(id);
  input.setAttribute('aria-invalid', texte ? 'true' : 'false');
  const ids = [PAR_ID[id].indice ? id + '-indice' : '', texte ? id + '-erreur' : ''].filter(Boolean);
  if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
}

function lireFormulaire() {
  const p = {}; let ok = true;
  CHAMPS.forEach(c => {
    const v = lire($(c.id).value);
    let erreur = '';
    if (v === null) { if (!c.facultatif) erreur = 'Cette case est nécessaire.'; }
    else if (Number.isNaN(v) || v < c.min || v > c.max) erreur = `Entrez une valeur entre ${ecrire(c.id, c.min)} et ${ecrire(c.id, c.max)} ${c.unite}.`;
    montrerErreur(c.id, erreur);
    if (erreur) ok = false;
    p[c.id] = v;
  });
  if (ok && !(p.ageFin > p.age)) { montrerErreur('ageFin', 'Choisissez un âge plus élevé que votre âge actuel.'); ok = false; }
  else if (ok && p.ageFin - p.age > 50) { montrerErreur('ageFin', 'Le calcul est limité à 50 ans.'); ok = false; }
  const d = document.querySelector('input[name="duree"]:checked');
  p.duree = d ? Number(d.value) : 25;
  return ok ? p : null;
}

const estJulien = p => Object.keys(JULIEN).every(k => p[k] !== null && Math.abs(p[k] - JULIEN[k]) < 1e-9);

function calculer() {
  const p = lireFormulaire();
  if (!p) return;
  const s = simuler(p);
  const c = croisement(s.annees);
  dernier = { p, s, c };
  const julien = estJulien(p);
  $('mode-texte').textContent = julien ? 'Exemple de Julien' : 'Vos chiffres';
  $('mode-texte').classList.toggle('perso', !julien);
  $('reinitialiser').hidden = julien;
  $('consigne').hidden = !julien;
  afficherResultats(p, s, c);
  dessiner();
  afficherTableau(s);
}

function afficherResultats(p, s, c) {
  const ageFin = NB0.format(p.ageFin);
  $('r-age').textContent = ageFin; $('b-age').textContent = ageFin;
  $('r-achat').textContent = milliers(s.A); $('b-achat').textContent = kEuros(Math.round(s.A / 1000) * 1000);
  $('r-location').textContent = milliers(s.B); $('b-location').textContent = kEuros(Math.round(s.B / 1000) * 1000);
  $('r-achat-detail').textContent = s.pret > 0 ? `Crédit de ${milliers(s.pret)} sur ${p.duree} ans` : 'Payé comptant, sans crédit';
  $('r-location-detail').textContent = `Loyer de ${euros(p.loyer)} par mois, ${euros(s.loyerFin)} à ${ageFin} ans`;

  const achatDevant = s.A > s.B;
  $('tuile-achat').classList.toggle('gagnante', achatDevant);
  $('tuile-location').classList.toggle('gagnante', !achatDevant);
  $('tuile-achat').querySelector('.devant').hidden = !achatDevant;
  $('tuile-location').querySelector('.devant').hidden = achatDevant;

  const ecart = Math.abs(s.A - s.B), echelle = Math.max(Math.abs(s.A), Math.abs(s.B), 1);
  let v;
  if (ecart / echelle < 0.02) v = `Presque à égalité : <span class="chiffre">${milliers(ecart)}</span> d’écart.`;
  else if (achatDevant) v = c.depart ? `L’achat est devant du début à la fin, avec <span class="chiffre">${milliers(ecart)}</span> d’écart.` : `L’achat passe devant vers ${NB0.format(c.age)} ans et finit avec <span class="chiffre">${milliers(ecart)}</span> d’avance.`;
  else v = `${s.annees.every(a => a.B >= a.A) ? 'La location reste devant' : 'La location finit devant'}, avec <span class="chiffre">${milliers(ecart)}</span> d’avance à ${ageFin} ans.`;
  $('r-verdict').innerHTML = v;

  // Chiffres clés
  const seuil = seuilImmo(p);
  const seuilTexte = seuil.cas === 'toujours' ? 'Toujours' : seuil.cas === 'jamais' ? 'Plus de 15 %/an' : `${seuil.valeur >= 0 ? '+' : '−'}${pourcent(Math.abs(seuil.valeur))}/an`;
  const seuilAide = seuil.cas === 'toujours' ? 'même si les prix baissent' : seuil.cas === 'jamais' ? 'la location gagne' : 'd’évolution des prix, au minimum';
  const te = p.revenu ? 100 * (s.m + s.assurMois) / p.revenu : null;
  const cles = [
    ['Mensualité', s.pret > 0 ? euros(s.m + s.assurMois) : '0 €', s.pret > 0 ? 'assurance comprise' : 'pas de crédit'],
    ['Fin du crédit', s.pret > 0 ? `${NB0.format(s.finCredit)} ans` : '—', s.pret > 0 ? `${milliers(s.interets)} d’intérêts` : ''],
    ['Part de vos revenus', te === null ? '—' : pourcent(te), te === null ? 'revenus non indiqués' : 'les banques visent 35 % au plus'],
    ['Pour que l’achat gagne', seuilTexte, seuilAide]
  ];
  $('chiffres-cles').innerHTML = cles.map(([t, d, a]) => `<div><dt>${t}</dt><dd>${d}${a ? `<small>${a}</small>` : ''}</dd></div>`).join('');

  // Alertes
  const L = [];
  const ligne = (type, texte) => L.push(`<li class="${type}"><span class="etat">${{ ok: 'OK', attention: 'À savoir', info: 'Info' }[type]}</span><span>${texte}</span></li>`);
  if (s.pret > 0) {
    if (s.finCredit > p.ageFin) ligne('attention', `Le crédit continue après ${ageFin} ans. Il resterait environ ${milliers(s.crdFin)} à rembourser, déjà retirés du résultat.`);
    const avant60 = s.finCredit < 60, sous200 = s.pret <= 200000;
    if (avant60 && sous200) ligne('ok', `Pas de questionnaire de santé (loi Lemoine) : le crédit finit avant 60 ans et la part assurée ne dépasse pas 200 000 €.${s.finCredit >= 59 ? ' De justesse : vérifiez avec votre date de naissance.' : ''}`);
    else ligne('attention', `Questionnaire de santé probable : la loi Lemoine n’en dispense que si le crédit finit avant 60 ans et si la part assurée ne dépasse pas 200 000 €.`);
    if (te !== null && te > 35) ligne('attention', `La mensualité dépasse 35 % de vos revenus : les banques risquent de refuser le crédit.`);
    if (te !== null && s.finCredit > p.ageFin) ligne('info', `Si votre pension vaut 75 % de vos revenus (environ la médiane en France), la mensualité en prendrait ${pourcent(100 * (s.m + s.assurMois) / (p.revenu * 0.75))} à la retraite.`);
  }
  if (p.rendement > 6.67) ligne('info', 'Votre rendement dépasse la moyenne de l’indice mondial depuis 2000 (6,67 % par an) : essayez aussi une valeur plus prudente.');
  $('alertes').innerHTML = L.join('');
  $('alertes').hidden = L.length === 0;
}

function afficherTableau(s) {
  document.querySelector('#tableau tbody').innerHTML = s.annees.map(a => {
    const e = a.A - a.B;
    const devant = Math.abs(e) < 500 ? 'égalité' : (e > 0 ? `achat, +${milliers(e)}` : `location, +${milliers(-e)}`);
    const fin = s.pret > 0 && Math.abs(a.age - s.finCredit) < 1e-9;
    return `<tr${fin ? ' class="fin-credit"' : ''}><td>${NB0.format(Math.floor(a.age + 1e-9))} ans${fin ? ' (fin du crédit)' : ''}</td><td>${euros(a.A)}</td><td>${euros(a.B)}</td><td>${devant}</td></tr>`;
  }).join('');
}

/* ---------- Le graphique ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function el(nom, attrs, parent, texte) {
  const e = document.createElementNS(SVGNS, nom);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (texte !== undefined) e.textContent = texte;
  if (parent) parent.appendChild(e);
  return e;
}
function pasRond(etendue, cible) {
  const brut = etendue / cible, p10 = Math.pow(10, Math.floor(Math.log10(brut)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p10 >= brut) return m * p10;
  return 10 * p10;
}

let geo = null;
function dessiner() {
  if (!dernier) return;
  const { s, c } = dernier;
  const svg = $('graphique'), zone = $('zone-graphique');
  const W = Math.max(280, Math.round(zone.clientWidth || 560));
  const H = Math.round(Math.min(300, Math.max(210, W * 0.46)));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  [...svg.querySelectorAll(':scope > :not(desc)')].forEach(n => n.remove());

  const etroit = W < 440;
  const M = { g: etroit ? 44 : 54, d: etroit ? 58 : 66, h: 10, b: 26 };
  const data = s.annees;
  const x0 = data[0].age, x1 = data[data.length - 1].age;
  const vals = data.flatMap(a => [a.A, a.B]);
  let ymin = Math.min(0, ...vals), ymax = Math.max(...vals);
  const pas = pasRond(ymax - ymin || 1, 4);
  ymin = Math.floor(ymin / pas) * pas; ymax = Math.ceil(ymax / pas) * pas;
  const X = a => M.g + (a - x0) / (x1 - x0) * (W - M.g - M.d);
  const Y = v => H - M.b - (v - ymin) / (ymax - ymin) * (H - M.h - M.b);
  geo = { X, Y, data, W, H, M };

  const g = el('g', {}, svg);
  for (let v = ymin; v <= ymax + 1e-6; v += pas) {
    el('line', { x1: M.g, x2: W - M.d, y1: Y(v), y2: Y(v), class: v === 0 ? 'axe' : 'grille-y' }, g);
    el('text', { x: M.g - 8, y: Y(v) + 4, 'text-anchor': 'end' }, g, kEuros(v));
  }
  const pasX = (x1 - x0) > 30 ? 10 : 5;
  const ticks = [x0];
  for (let a = Math.ceil((x0 + 1) / pasX) * pasX; a < x1; a += pasX) if (X(a) - X(x0) >= 34 && X(x1) - X(a) >= 58) ticks.push(a);
  ticks.push(x1);
  ticks.forEach((a, i) => el('text', { x: X(a), y: H - 6, 'text-anchor': i === 0 ? 'start' : (i === ticks.length - 1 ? 'end' : 'middle') }, g, `${NB0.format(a)}${i === ticks.length - 1 ? ' ans' : ''}`));

  const chemin = k => data.map((a, i) => `${i ? 'L' : 'M'}${X(a.age).toFixed(1)},${Y(a[k]).toFixed(1)}`).join('');
  el('path', { d: chemin('B'), class: 'courbe location' }, g);
  el('path', { d: chemin('A'), class: 'courbe achat' }, g);

  let yA = Y(s.A), yB = Y(s.B);
  if (Math.abs(yA - yB) < 16) { const m = (yA + yB) / 2; if (yA <= yB) { yA = m - 8; yB = m + 8; } else { yA = m + 8; yB = m - 8; } }
  el('text', { x: W - M.d + 8, y: yA + 4, class: 'etiquette-fin' }, g, kEuros(Math.round(s.A / 1000) * 1000));
  el('text', { x: W - M.d + 8, y: yB + 4, class: 'etiquette-fin' }, g, kEuros(Math.round(s.B / 1000) * 1000));

  if (c && !c.depart) {
    const a = data[c.i - 1], b = data[c.i];
    const d0 = a.A - a.B, d1 = b.A - b.B, t = d0 / (d0 - d1);
    const xc = a.age + t * (b.age - a.age), yc = a.A + t * (b.A - a.A);
    el('circle', { cx: X(xc), cy: Y(yc), r: 4.5, class: 'croisement' }, g);
    const haut = Y(yc) - 16 > M.h + 8;
    el('text', { x: X(xc) - 8, y: haut ? Y(yc) - 10 : Y(yc) + 20, 'text-anchor': 'end', class: 'note-croisement' }, g, `${NB0.format(c.age)} ans`);
  }

  geo.viseur = el('line', { y1: M.h, y2: H - M.b, class: 'viseur', visibility: 'hidden' }, g);
  geo.pA = el('circle', { r: 5, class: 'point', fill: 'var(--achat)', visibility: 'hidden' }, g);
  geo.pB = el('circle', { r: 5, class: 'point', fill: 'var(--location)', visibility: 'hidden' }, g);
  el('rect', { x: M.g, y: 0, width: W - M.g - M.d, height: H - M.b, fill: 'transparent' }, g);

  $('graphique-desc').textContent = `Patrimoine de ${NB0.format(x0)} à ${NB0.format(x1)} ans. À ${NB0.format(x1)} ans : en achetant, ${milliers(s.A)} ; en louant et en plaçant, ${milliers(s.B)}. Le détail est dans le tableau année par année.`;
}

function survol(ev) {
  if (!geo) return;
  const svg = $('graphique'), box = svg.getBoundingClientRect();
  const x = (ev.clientX - box.left) * (geo.W / box.width);
  if (x < geo.M.g - 10 || x > geo.W - geo.M.d + 10) return cacher();
  let best = 0, bd = Infinity;
  geo.data.forEach((a, i) => { const d = Math.abs(geo.X(a.age) - x); if (d < bd) { bd = d; best = i; } });
  const a = geo.data[best], px = geo.X(a.age);
  geo.viseur.setAttribute('x1', px); geo.viseur.setAttribute('x2', px); geo.viseur.setAttribute('visibility', 'visible');
  geo.pA.setAttribute('cx', px); geo.pA.setAttribute('cy', geo.Y(a.A)); geo.pA.setAttribute('visibility', 'visible');
  geo.pB.setAttribute('cx', px); geo.pB.setAttribute('cy', geo.Y(a.B)); geo.pB.setAttribute('visibility', 'visible');
  const bulle = $('bulle');
  bulle.innerHTML = `<b>${NB0.format(Math.floor(a.age + 1e-9))} ans</b><br><i class="point-serie achat"></i>Acheter&nbsp;: ${euros(a.A)}<br><i class="point-serie location"></i>Louer et placer&nbsp;: ${euros(a.B)}`;
  bulle.hidden = false;
  const echelle = box.width / geo.W, bw = bulle.offsetWidth, zw = $('zone-graphique').clientWidth;
  let left = px * echelle + 14;
  if (left + bw > zw) left = px * echelle - bw - 14;
  bulle.style.left = Math.max(0, left) + 'px';
  bulle.style.top = Math.max(0, Math.min(geo.Y(Math.max(a.A, a.B)) * echelle - 10, box.height - bulle.offsetHeight)) + 'px';
}
function cacher() {
  if (!geo) return;
  $('bulle').hidden = true;
  [geo.viseur, geo.pA, geo.pB].forEach(n => n && n.setAttribute('visibility', 'hidden'));
}

/* ---------- Démarrage ---------- */
function init() {
  construireCases();
  remplir(JULIEN);
  let minuteur = null, image = null;
  const plusTard = () => { clearTimeout(minuteur); minuteur = setTimeout(calculer, 150); };
  const auProchainAffichage = () => { if (image) return; image = requestAnimationFrame(() => { image = null; calculer(); }); };
  CHAMPS.forEach(c => {
    const input = $(c.id), curseur = $(c.id + '-curseur');
    input.addEventListener('input', () => {
      const v = lire(input.value);
      if (v !== null && !Number.isNaN(v)) placerCurseur(c.id, v);
      plusTard();
    });
    input.addEventListener('blur', () => {
      const v = lire(input.value);
      if (v !== null && !Number.isNaN(v)) input.value = ecrire(c.id, v);
    });
    curseur.addEventListener('input', () => {
      const v = Number(curseur.value);
      input.value = ecrire(c.id, v);
      placerCurseur(c.id, v);
      auProchainAffichage();
    });
  });
  document.querySelectorAll('input[name="duree"]').forEach(r => r.addEventListener('change', () => {
    const t = TAUX_MOYENS[r.value];
    $('taux').value = ecrire('taux', t); placerCurseur('taux', t);
    calculer();
  }));
  $('reinitialiser').addEventListener('click', () => { remplir(JULIEN); calculer(); });
  $('formulaire').addEventListener('submit', e => e.preventDefault());

  const zone = $('zone-graphique');
  zone.addEventListener('pointermove', survol);
  zone.addEventListener('pointerdown', survol);
  zone.addEventListener('pointerleave', cacher);
  let largeur = 0;
  new ResizeObserver(() => { if (zone.clientWidth !== largeur) { largeur = zone.clientWidth; dessiner(); } }).observe(zone);

  if (CONFIG.lienVideo) { $('lien-video').href = CONFIG.lienVideo; $('lien-video-zone').hidden = false; }
  if (CONFIG.formulaireEmail) { $('newsletter-form').action = CONFIG.formulaireEmail; $('newsletter').hidden = false; }

  const barre = $('barre-mobile');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(e => { barre.hidden = e[0].isIntersecting; }, { threshold: 0.1 }).observe($('resultats'));
  }
  calculer();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}
if (typeof module !== 'undefined') module.exports = { simuler, croisement, seuilImmo, mensualite, JULIEN, TAUX_MOYENS };
