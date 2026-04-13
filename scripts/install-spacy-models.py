"""
Installe uniquement les modèles spaCy nécessaires pour les langues supportées.
Vérifie si le modèle est déjà installé avant de le télécharger.
"""

import subprocess
import sys

# Modèles par langue (en sync avec scripts/config/langues.js)
MODELS = {
    'ru': 'ru_core_news_sm',
    'en': 'en_core_web_sm',
    'fr': 'fr_core_news_sm',
    'de': 'de_core_news_sm',
    'es': 'es_core_news_sm',
    'it': 'it_core_news_sm',
    'pt': 'pt_core_news_sm',
    'nl': 'nl_core_news_sm',
    # zh et ja nécessitent des modèles plus lourds, installés à la demande
}

def model_installed(model_name):
    try:
        import importlib
        importlib.import_module(model_name.replace('-', '_'))
        return True
    except ImportError:
        return False

def install_model(model_name):
    result = subprocess.run(
        [sys.executable, '-m', 'spacy', 'download', model_name],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f'⚠️  Échec installation {model_name}: {result.stderr.strip()}')
        return False
    return True

for lang, model in MODELS.items():
    if model_installed(model):
        print(f'✅ {model} déjà installé')
    else:
        print(f'📥 Installation de {model}...')
        if install_model(model):
            print(f'✅ {model} installé')
        else:
            print(f'❌ {model} non installé (la langue {lang} ne sera pas annotée)')

print('\n✅ Installation des modèles terminée')
