"""
Usage: python scripts/4-annotate.py <slug> <langueSource> <langueCible>
Annote grammaticalement les paragraphes (S/V/C).
Utilise Mistral AI si MISTRAL_API_KEY est disponible, sinon spaCy.
"""

import json
import sys
import os
import time
import urllib.request
import urllib.error
from pathlib import Path

# ── Arguments ─────────────────────────────────────────────────────────────────

if len(sys.argv) < 4:
    print("❌ Usage: python scripts/4-annotate.py <slug> <langueSource> <langueCible>")
    sys.exit(1)

slug = sys.argv[1]
langue_source = sys.argv[2]
langue_cible = sys.argv[3]

# ── Configuration ──────────────────────────────────────────────────────────────

MISTRAL_KEY = os.environ.get('MISTRAL_API_KEY', '').strip()
USE_MISTRAL = bool(MISTRAL_KEY)

# ── Modèles spaCy (fallback) ───────────────────────────────────────────────────

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

import spacy

def charger_modele(langue):
    model = SPACY_MODELS.get(langue)
    if not model:
        return None
    try:
        return spacy.load(model)
    except OSError:
        print(f"⚠️  Modèle spaCy '{model}' non installé pour '{langue}'.")
        return None

nlp_source = charger_modele(langue_source)
nlp_cible  = charger_modele(langue_cible)

if USE_MISTRAL:
    print(f"🔬 Annotation grammaticale via Mistral AI : {langue_source} et {langue_cible}")
else:
    print(f"⚠️  MISTRAL_API_KEY non disponible — utilisation de spaCy.")
    print(f"🔬 Annotation grammaticale via spaCy : {langue_source} et {langue_cible}")

# ── Ponctuation de dialogue → toujours null ────────────────────────────────────

PONCTUATIONS_DIALOGUE = {'—', '–', '-', '«', '»', '\u201c', '\u201d'}

# ── Annotation spaCy (fallback) ────────────────────────────────────────────────

POS_SUJET = {'NOUN', 'PROPN', 'PRON'}
POS_VERBE = {'VERB', 'AUX'}
POS_COMPL = {'ADJ', 'ADV', 'ADP', 'NUM'}

DEP_SUJET = {'nsubj', 'nsubjpass', 'csubj', 'csubjpass', 'expl'}
DEP_VERBE = {'ROOT', 'aux', 'auxpass', 'cop'}
DEP_COMPL = {'obj', 'iobj', 'dobj', 'attr', 'advmod', 'prep', 'pobj', 'acomp', 'xcomp', 'ccomp', 'obl', 'nmod'}

def classifier_token_spacy(token):
    if token.text.strip() in PONCTUATIONS_DIALOGUE:
        return None
    if token.pos_ in ('PUNCT', 'SPACE', 'SYM', 'X'):
        return None
    if token.pos_ in ('DET', 'CCONJ', 'SCONJ', 'PART', 'INTJ'):
        return None
    if token.dep_ in DEP_SUJET:
        return 's'
    if token.dep_ in DEP_VERBE or token.pos_ in POS_VERBE:
        return 'v'
    if token.dep_ in DEP_COMPL:
        return 'c'
    if token.pos_ in POS_SUJET:
        return 's'
    if token.pos_ in POS_COMPL:
        return 'c'
    return None

def annoter_avec_spacy(texte, nlp):
    if nlp is None:
        return [{'text': texte, 'type': None}]

    doc = nlp(texte)
    tokens_bruts = [{'text': t.text_with_ws, 'type': classifier_token_spacy(t)} for t in doc]

    if not tokens_bruts:
        return [{'text': texte, 'type': None}]

    # Regrouper les tokens consécutifs du même type
    groupes = [tokens_bruts[0].copy()]
    for tok in tokens_bruts[1:]:
        if tok['type'] == groupes[-1]['type']:
            groupes[-1]['text'] += tok['text']
        else:
            groupes.append(tok.copy())

    # Séparer les espaces de fin en tokens null
    resultat = []
    for g in groupes:
        texte_g, type_g = g['text'], g['type']
        if type_g is not None and texte_g != texte_g.rstrip():
            stripped = texte_g.rstrip()
            espace = texte_g[len(stripped):]
            if stripped:
                resultat.append({'text': stripped, 'type': type_g})
            if espace:
                resultat.append({'text': espace, 'type': None})
        elif texte_g:
            resultat.append({'text': texte_g, 'type': type_g})

    return resultat

# ── Annotation Mistral ─────────────────────────────────────────────────────────

PROMPT_BASE = """\
Split this sentence into grammatical tokens and classify each one.

Return a JSON object: {"tokens": [{"text": "...", "type": "s"|"v"|"c"|null}, ...]}

Types:
- "s" = subject (noun phrase, pronoun, proper noun acting as grammatical subject)
- "v" = verb phrase (main verb, auxiliaries, copula — keep contractions together: "don't", "I'm", "he's", "can't", "n'aime pas")
- "c" = complement (direct/indirect object, adverb, prepositional phrase, adjective complement)
- null = articles, determiners, conjunctions, punctuation, dialogue dashes (— or -), negation words, spaces

CRITICAL RULES:
1. The concatenation of ALL "text" values MUST equal the input EXACTLY (character for character).
2. Each space between words must be its own null token: {"text": " ", "type": null}
3. Dialogue dashes (— or - at start of speech): type null
4. Verb contractions/negations stay with their verb: "don't" → one "v" token, not split

"""

# Few-shot examples par langue
EXEMPLES_PAR_LANGUE = {
    'es': [
        (
            "Blanca sonrió.",
            [{"text":"Blanca","type":"s"},{"text":" ","type":None},{"text":"sonrió","type":"v"},{"text":".","type":None}]
        ),
        (
            "—Yo puedo ser tu amigo.",
            [{"text":"—","type":None},{"text":"Yo","type":"s"},{"text":" ","type":None},{"text":"puedo ser","type":"v"},{"text":" ","type":None},{"text":"tu amigo","type":"c"},{"text":".","type":None}]
        ),
        (
            "Tragué saliva.",
            [{"text":"Tragué","type":"v"},{"text":" ","type":None},{"text":"saliva","type":"c"},{"text":".","type":None}]
        ),
        (
            "No tengo amigos aquí.",
            [{"text":"No ","type":None},{"text":"tengo","type":"v"},{"text":" ","type":None},{"text":"amigos aquí","type":"c"},{"text":".","type":None}]
        ),
    ],
    'en': [
        (
            "I don't like this neighborhood.",
            [{"text":"I","type":"s"},{"text":" ","type":None},{"text":"don't like","type":"v"},{"text":" ","type":None},{"text":"this ","type":None},{"text":"neighborhood","type":"c"},{"text":".","type":None}]
        ),
        (
            "-She warned.",
            [{"text":"-","type":None},{"text":"She","type":"s"},{"text":" ","type":None},{"text":"warned","type":"v"},{"text":".","type":None}]
        ),
        (
            "Blanca turned and looked at me.",
            [{"text":"Blanca","type":"s"},{"text":" ","type":None},{"text":"turned","type":"v"},{"text":" ","type":None},{"text":"and ","type":None},{"text":"looked","type":"v"},{"text":" ","type":None},{"text":"at me","type":"c"},{"text":".","type":None}]
        ),
        (
            "My father writes them for me.",
            [{"text":"My ","type":None},{"text":"father","type":"s"},{"text":" ","type":None},{"text":"writes","type":"v"},{"text":" ","type":None},{"text":"them for me","type":"c"},{"text":".","type":None}]
        ),
    ],
    'fr': [
        (
            "Elle sourit.",
            [{"text":"Elle","type":"s"},{"text":" ","type":None},{"text":"sourit","type":"v"},{"text":".","type":None}]
        ),
        (
            "Il n'aime pas ça.",
            [{"text":"Il","type":"s"},{"text":" ","type":None},{"text":"n'aime pas","type":"v"},{"text":" ","type":None},{"text":"ça","type":"c"},{"text":".","type":None}]
        ),
        (
            "— Je ne comprends pas.",
            [{"text":"— ","type":None},{"text":"Je","type":"s"},{"text":" ","type":None},{"text":"ne comprends pas","type":"v"},{"text":".","type":None}]
        ),
    ],
    'ru': [
        (
            "Она улыбнулась.",
            [{"text":"Она","type":"s"},{"text":" ","type":None},{"text":"улыбнулась","type":"v"},{"text":".","type":None}]
        ),
        (
            "— Я не хочу.",
            [{"text":"— ","type":None},{"text":"Я","type":"s"},{"text":" ","type":None},{"text":"не хочу","type":"v"},{"text":".","type":None}]
        ),
    ],
}

_prompts_cache = {}

def get_prompt(langue):
    """Construit le prompt avec few-shot examples pour la langue donnée."""
    if langue in _prompts_cache:
        return _prompts_cache[langue]

    exemples = EXEMPLES_PAR_LANGUE.get(langue, [])
    if not exemples:
        prompt = PROMPT_BASE + "Sentence: "
    else:
        exemples_str = "Examples:\n\n"
        for texte_ex, tokens_ex in exemples:
            output = json.dumps({"tokens": tokens_ex}, ensure_ascii=False)
            exemples_str += f"Input: {json.dumps(texte_ex, ensure_ascii=False)}\nOutput: {output}\n\n"
        prompt = PROMPT_BASE + exemples_str + "Now annotate:\nSentence: "

    _prompts_cache[langue] = prompt
    return prompt

_mistral_last_call = 0.0

def annoter_avec_mistral(texte, langue):
    """Annote via Mistral. Retourne une liste de tokens, ou None si échec/validation échoue."""
    global _mistral_last_call

    if not MISTRAL_KEY:
        return None

    # Rate limiting : ~1 req/s
    elapsed = time.time() - _mistral_last_call
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    try:
        body = json.dumps({
            "model": "mistral-small-latest",
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": f"You are a {langue} linguistics expert. Respond ONLY with valid JSON."
                },
                {
                    "role": "user",
                    "content": get_prompt(langue) + texte
                }
            ]
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.mistral.ai/v1/chat/completions',
            data=body,
            headers={
                'Authorization': f'Bearer {MISTRAL_KEY}',
                'Content-Type': 'application/json',
            }
        )

        _mistral_last_call = time.time()

        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))

        content = result['choices'][0]['message']['content'].strip()
        parsed = json.loads(content)

        tokens = parsed.get('tokens', []) if isinstance(parsed, dict) else parsed
        if not isinstance(tokens, list) or not tokens:
            return None

        # Validation : la concaténation doit redonner le texte original exactement
        if ''.join(t.get('text', '') for t in tokens) != texte:
            return None

        # Normaliser les types
        types_valides = {'s', 'v', 'c', None}
        return [
            {'text': t['text'], 'type': t.get('type') if t.get('type') in types_valides else None}
            for t in tokens
        ]

    except Exception:
        return None

# ── Post-traitement (indépendant de la méthode) ────────────────────────────────

def post_traiter(tokens):
    """
    Corrections appliquées quelle que soit la méthode d'annotation :
    - Tirets de dialogue purs → null
    - \\n à l'intérieur d'un token → extrait en token null séparé
    """
    resultat = []
    for tok in tokens:
        texte, type_ = tok['text'], tok['type']

        # Forcer les tirets de dialogue en null
        if texte.strip() in PONCTUATIONS_DIALOGUE:
            resultat.append({'text': texte, 'type': None})
            continue

        # Séparer les \n intégrés au token
        if '\n' in texte and len(texte) > 1:
            parties = texte.split('\n')
            for i, partie in enumerate(parties):
                if partie:
                    resultat.append({'text': partie, 'type': type_})
                if i < len(parties) - 1:
                    resultat.append({'text': '\n', 'type': None})
        else:
            resultat.append({'text': texte, 'type': type_})

    return resultat

# ── Annotation principale ──────────────────────────────────────────────────────

def annoter_texte(texte, langue, nlp):
    """
    Annote un texte complet.
    Mistral reçoit le paragraphe entier (meilleur contexte).
    Si la validation échoue, spaCy annote ligne par ligne.
    """
    # Essai Mistral sur le paragraphe complet
    if USE_MISTRAL:
        tokens = annoter_avec_mistral(texte, langue)
        if tokens is not None:
            return post_traiter(tokens)

    # Fallback spaCy : ligne par ligne pour éviter les \n
    lignes = texte.split('\n')
    tokens = []
    for i, ligne in enumerate(lignes):
        if ligne:
            tokens.extend(annoter_avec_spacy(ligne, nlp))
        if i < len(lignes) - 1:
            tokens.append({'text': '\n', 'type': None})

    return post_traiter(tokens)

# ── Traitement ─────────────────────────────────────────────────────────────────

tmp_dir = Path(f'./scripts/tmp/{slug}')
input_path  = tmp_dir / 'translated.json'
output_path = tmp_dir / 'annotated.json'

if not input_path.exists():
    print(f"❌ Fichier introuvable : {input_path}")
    print("   Lancez d'abord l'étape 3 (traduction)")
    sys.exit(1)

with open(input_path, encoding='utf-8') as f:
    data = json.load(f)

total   = sum(len(ch['paragraphes']) for ch in data)
traites = 0
print(f"   {total} paragraphes à annoter")

for chapitre in data:
    for para in chapitre['paragraphes']:
        para[f'tokens_{langue_source}'] = annoter_texte(
            para.get(langue_source, ''), langue_source, nlp_source
        )
        para[f'tokens_{langue_cible}'] = annoter_texte(
            para.get(langue_cible, ''), langue_cible, nlp_cible
        )
        traites += 1
        print(f'\r   {traites}/{total} paragraphes annotés', end='', flush=True)

print(f'\n✅ Annotation terminée → {output_path}')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
