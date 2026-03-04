#!/usr/bin/env python3
"""
deploy-apps-script.py
Wgrywa js/apps-script.gs do Google Apps Script i tworzy nowy deployment.

Wymagania:
  pip install google-auth google-auth-httplib2 google-api-python-client

Użycie:
  python3 scripts/deploy-apps-script.py

Konfiguracja (ustaw zmienne środowiskowe lub edytuj DEFAULTS poniżej):
  APPS_SCRIPT_ID   — ID projektu Apps Script (z Ustawienia projektu)
  GCP_KEY_FILE     — ścieżka do klucza JSON Service Account (domyślnie: .secrets/gcp-key.json)
"""

import os, sys, json, pathlib

# ── Konfiguracja ──────────────────────────────────────────────────────────────
SCRIPT_ID    = os.environ.get('APPS_SCRIPT_ID', '')            # uzupełnij po setup
KEY_FILE     = os.environ.get('GCP_KEY_FILE',   '.secrets/gcp-key.json')
SOURCE_FILE  = 'js/apps-script.gs'
DEPLOY_DESC  = 'Auto-deploy by Claude Code'

# ── Walidacja ──────────────────────────────────────────────────────────────────
repo_root = pathlib.Path(__file__).parent.parent
key_path  = repo_root / KEY_FILE
src_path  = repo_root / SOURCE_FILE

if not SCRIPT_ID:
    print('❌  Ustaw APPS_SCRIPT_ID (ID projektu Apps Script)')
    print('    Znajdziesz go w: edytor Apps Script → Ustawienia projektu → ID skryptu')
    sys.exit(1)

if not key_path.exists():
    print(f'❌  Nie znaleziono klucza: {key_path}')
    print(f'    Pobierz klucz JSON z GCP Console → Service Accounts → Keys')
    sys.exit(1)

if not src_path.exists():
    print(f'❌  Nie znaleziono pliku źródłowego: {src_path}')
    sys.exit(1)

# ── Import bibliotek ───────────────────────────────────────────────────────────
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
except ImportError:
    print('❌  Brakujące biblioteki. Uruchom:')
    print('    pip install google-auth google-auth-httplib2 google-api-python-client')
    sys.exit(1)

# ── Auth ───────────────────────────────────────────────────────────────────────
SCOPES = ['https://www.googleapis.com/auth/script.projects']

creds = service_account.Credentials.from_service_account_file(
    str(key_path), scopes=SCOPES
)
service = build('script', 'v1', credentials=creds, cache_discovery=False)

# ── Wczytaj źródło ─────────────────────────────────────────────────────────────
source = src_path.read_text(encoding='utf-8')
print(f'✓  Wczytano {SOURCE_FILE} ({len(source)} znaków)')

# ── Aktualizuj zawartość projektu ──────────────────────────────────────────────
body = {
    'files': [
        {
            'name': 'Code',
            'type': 'SERVER_JS',
            'source': source
        }
    ]
}

print(f'↑  Wgrywam do Apps Script (ID: {SCRIPT_ID[:20]}...)...')
service.projects().updateContent(scriptId=SCRIPT_ID, body=body).execute()
print('✓  Kod zaktualizowany')

# ── Utwórz nową wersję ────────────────────────────────────────────────────────
version = service.projects().versions().create(
    scriptId=SCRIPT_ID,
    body={'description': DEPLOY_DESC}
).execute()
version_num = version['versionNumber']
print(f'✓  Nowa wersja: v{version_num}')

# ── Zaktualizuj deployment ─────────────────────────────────────────────────────
# Znajdź istniejący Web App deployment
deploys = service.projects().deployments().list(scriptId=SCRIPT_ID).execute()
web_deploy = None
for d in deploys.get('deployments', []):
    cfg = d.get('deploymentConfig', {})
    if cfg.get('manifestFileName') or d.get('deploymentId', '').startswith('@'):
        continue  # pomiń HEAD deployment
    if cfg.get('access') == 'ANYONE' or True:
        web_deploy = d
        break

if web_deploy:
    deploy_id = web_deploy['deploymentId']
    service.projects().deployments().update(
        scriptId=SCRIPT_ID,
        deploymentId=deploy_id,
        body={
            'deploymentConfig': {
                'versionNumber': version_num,
                'manifestFileName': 'appsscript',
                'description': DEPLOY_DESC
            }
        }
    ).execute()
    print(f'✓  Deployment zaktualizowany (ID: {deploy_id[:20]}...)')
    print()
    print('🚀  Gotowe! Apps Script zaktualizowany i wdrożony.')
else:
    print()
    print('⚠  Nie znaleziono istniejącego Web App deployment.')
    print('   Kod został zaktualizowany, ale musisz ręcznie stworzyć deployment raz w edytorze.')
    print('   Kolejne uruchomienia tego skryptu będą aktualizować istniejący deployment.')
