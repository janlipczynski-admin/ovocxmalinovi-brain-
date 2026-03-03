#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# OvocxMalinovi — instalacja git hooks
# Uruchom raz po sklonowaniu: bash scripts/install-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")/.."

HOOK=".git/hooks/pre-commit"

cat > "$HOOK" << 'EOF'
#!/bin/bash
# OvocxMalinovi — pre-commit hook
# Blokuje commit jeśli jakikolwiek test nie przechodzi
cd "$(git rev-parse --show-toplevel)"
echo ""
echo "▶  Pre-commit: uruchamiam testy..."
bash tests/run-all.sh
EOF

chmod +x "$HOOK"
echo "✅  Hook pre-commit zainstalowany w $HOOK"
echo "   Każdy commit będzie poprzedzony pełnym suite testów."
