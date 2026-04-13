"""
Usage: python scripts/4-annotate.py <slug> <langueSource> <langueCible>
Annote grammaticalement les paragraphes (S/V/C) avec spaCy.
Produit scripts/tmp/<slug>/annotated.json
"""

import json
import sys
import os
import re
from pathlib import Path

# ── Arguments ─────────────────────────────────────────────────────────────────

if len(sys.argv) < 4:
    print("❌ Usage: python scripts/4-annotate.py <slug> <langueSource> <langueCible>")
    sys.exit(1)

slug = sys.argv[1]
langue_source = sys.argv[2]
langue_cible = sys.argv[3]

# ── Modèles spaCy par langue ───────────────────────────────────────────────────

SPACY_MODELS = {
    'ru': 'ru_core_news_sm',
    'en': 'en_core_web_sm',
    'fr': 'fr_core_news_sm',
    'de': 'de_core_news_sm',
    'es': 'es_core_news_sm',
    'it': 'it_core_news_sm',
    'pt': 'pt_core_news_sm',
    'nl': 'nl_core_news_sm',
}

# ── Chargement spaCy ───────────────────────────────────────────────────────────

import spacy

def charger_modele(langue):
    model = SPACY_MODELS.get(langue)
    if not model:
        print(f"⚠️  Langue '{langue}' non supportée pour l'annotation. Tokens sans type.")
        return None
    try:
        return spacy.load(model)
    except OSError:
        print(f"⚠️  Modèle '{model}' non installé. Tokens sans type pour '{langue}'.")
        print(f"   Installer : python -m spacy download {model}")
        return None

print(f"🔬 Annotation grammaticale : {langue_source} et {langue_cible}")
nlp_source = charger_modele(langue_source)
nlp_cible  = charger_modele(langue_cible)

# ── Correspondance POS spaCy → type S/V/C ─────────────────────────────────────

# POS tags universels (Universal Dependencies)
POS_SUJET = {'NOUN', 'PROPN', 'PRON'}         # noms, noms propres, pronoms
POS_VERBE = {'VERB', 'AUX'}                    # verbes, auxiliaires
POS_COMPL = {'ADJ', 'ADV', 'ADP', 'NUM'}       # adjectifs, adverbes, prépositions, nombres

# Dépendances syntaxiques indiquant un sujet
DEP_SUJET = {'nsubj', 'nsubjpass', 'csubj', 'csubjpass', 'expl'}
# Dépendances syntaxiques indiquant un verbe principal
DEP_VERBE = {'ROOT', 'aux', 'auxpass', 'cop'}
# Dépendances syntaxiques indiquant un complément
DEP_COMPL = {'obj', 'iobj', 'dobj', 'attr', 'advmod', 'prep', 'pobj', 'acomp', 'xcomp', 'ccomp', 'obl', 'nmod'}

def classifier_token(token):
    """Retourne 's', 'v', 'c' ou None pour un token spaCy."""
    # Ponctuation et espaces → null
    if token.pos_ in ('PUNCT', 'SPACE', 'SYM', 'X'):
        return None
    # Déterminants et conjonctions → null (texte de liaison)
    if token.pos_ in ('DET', 'CCONJ', 'SCONJ', 'PART', 'INTJ'):
        return None

    # Priorité à la dépendance syntaxique
    if token.dep_ in DEP_SUJET:
        return 's'
    if token.dep_ in DEP_VERBE or token.pos_ in POS_VERBE:
        return 'v'
    if token.dep_ in DEP_COMPL:
        return 'c'

    # Fallback par POS
    if token.pos_ in POS_SUJET:
        return 's'
    if token.pos_ in POS_COMPL:
        return 'c'

    return None

def annoter_texte(texte, nlp):
    """
    Annote un texte et retourne une liste de tokens {text, type}.
    Regroupe les tokens consécutifs de même type.
    """
    if nlp is None:
        # Pas de modèle : retourner le texte comme un seul token null
        return [{'text': texte, 'type': None}]

    doc = nlp(texte)
    tokens_bruts = []

    for token in doc:
        texte_token = token.text_with_ws
        type_token = classifier_token(token)
        tokens_bruts.append({'text': texte_token, 'type': type_token})

    if not tokens_bruts:
        return [{'text': texte, 'type': None}]

    # Regrouper les tokens consécutifs du même type
    groupes = [tokens_bruts[0].copy()]
    for tok in tokens_bruts[1:]:
        if tok['type'] == groupes[-1]['type']:
            groupes[-1]['text'] += tok['text']
        else:
            groupes.append(tok.copy())

    # Nettoyer : séparer les espaces en tokens null
    resultat = []
    for g in groupes:
        texte_g = g['text']
        type_g = g['type']

        if type_g is not None and texte_g != texte_g.strip():
            # Séparer l'espace de fin
            stripped = texte_g.rstrip()
            espace = texte_g[len(stripped):]
            if stripped:
                resultat.append({'text': stripped, 'type': type_g})
            if espace:
                resultat.append({'text': espace, 'type': None})
        else:
            if texte_g:
                resultat.append({'text': texte_g, 'type': type_g})

    return resultat

# ── Traitement ─────────────────────────────────────────────────────────────────

tmp_dir = Path(f'./scripts/tmp/{slug}')
input_path = tmp_dir / 'translated.json'
output_path = tmp_dir / 'annotated.json'

if not input_path.exists():
    print(f"❌ Fichier introuvable : {input_path}")
    print("   Lancez d'abord l'étape 3 (traduction)")
    sys.exit(1)

with open(input_path, encoding='utf-8') as f:
    data = json.load(f)

total = sum(len(ch['paragraphes']) for ch in data)
traites = 0

print(f"   {total} paragraphes à annoter")

for chapitre in data:
    for para in chapitre['paragraphes']:
        texte_source = para.get(langue_source, '')
        texte_cible  = para.get(langue_cible, '')

        para[f'tokens_{langue_source}'] = annoter_texte(texte_source, nlp_source)
        para[f'tokens_{langue_cible}']  = annoter_texte(texte_cible, nlp_cible)

        traites += 1
        print(f'\r   {traites}/{total} paragraphes annotés', end='', flush=True)

print(f'\n✅ Annotation terminée → {output_path}')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
