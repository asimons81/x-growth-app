#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔍 Running lightweight secret scan on tracked files..."

PATTERNS=(
  'AIza[0-9A-Za-z\-_]{35}'
  'sk-[A-Za-z0-9]{20,}'
  'ghp_[A-Za-z0-9]{30,}'
  'xox[baprs]-[A-Za-z0-9-]{20,}'
  'sb_secret_[A-Za-z0-9_\-]+'
  '-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----'
)

FAIL=0
for p in "${PATTERNS[@]}"; do
  if git ls-files | grep -Ev '^\.env(\..*)?$' | xargs -r rg -n --hidden -g '!.git' -e "$p" >/tmp/scan_hits.txt 2>/dev/null; then
    echo "❌ Potential secret pattern hit: $p"
    cat /tmp/scan_hits.txt
    FAIL=1
  fi
done

if [[ $FAIL -eq 1 ]]; then
  echo "Secret scan failed. Remove/redact secrets before merge."
  exit 1
fi

echo "✅ Secret scan passed"
