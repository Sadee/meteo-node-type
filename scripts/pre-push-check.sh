#!/usr/bin/env bash
# Runs every check (secret scan, lint, formatting, typecheck, tests, dependency audit, build)
# for server and client, then prints a summary.
# Exits non-zero if any check fails, so it can also be used as a git pre-push hook.
#
#   scripts/pre-push-check.sh           run everything
#   scripts/pre-push-check.sh --verbose show full output of passing checks too
#
# Install as a hook: ln -s ../../scripts/pre-push-check.sh .git/hooks/pre-push

set -uo pipefail

# Dependencies are only installed in the dev container (node_modules are Docker volumes), so on the
# host every check would fail. Stop early with a clear message instead. Docker creates /.dockerenv.
if [[ ! -f /.dockerenv ]]; then
  cat >&2 <<'EOF'

  ⚠  Not running inside the dev container.

  Please run checks / push via the VS Code terminal (within the workspace container),
  where the dependencies are installed. Nothing was checked and nothing was pushed.

  (To push without checks anyway: git push --no-verify)

EOF
  exit 1
fi

cd "$(dirname "$(readlink -f "$0")")/.."

verbose=false
[[ "${1:-}" == "--verbose" ]] && verbose=true

if [[ -t 1 ]]; then
  green=$'\e[32m' red=$'\e[31m' dim=$'\e[2m' bold=$'\e[1m' reset=$'\e[0m'
else
  green="" red="" dim="" bold="" reset=""
fi

results=()
failed=0
log=$(mktemp)
trap 'rm -f "$log"' EXIT

# check <label> <dir> <command...>
check() {
  local label=$1 dir=$2
  shift 2
  printf "%s▸ %-22s%s" "$bold" "$label" "$reset"

  if [[ "$dir" != "." && ! -d "$dir/node_modules" ]]; then
    printf "%sSKIP%s (no node_modules; run: npm --prefix %s install)\n" "$red" "$reset" "$dir"
    results+=("${red}✗${reset} $label (dependencies not installed)")
    failed=1
    return
  fi

  local start=$SECONDS
  if (cd "$dir" && "$@") >"$log" 2>&1; then
    printf "%sPASS%s %s(%ss)%s\n" "$green" "$reset" "$dim" $((SECONDS - start)) "$reset"
    results+=("${green}✓${reset} $label")
    $verbose && cat "$log"
  else
    printf "%sFAIL%s %s(%ss)%s\n" "$red" "$reset" "$dim" $((SECONDS - start)) "$reset"
    results+=("${red}✗${reset} $label")
    failed=1
    sed 's/^/    /' "$log"
  fi
}

# Committed history plus the working tree (respects .gitignore, so local .env files are skipped).
secrets() {
  if ! command -v gitleaks >/dev/null; then
    echo "gitleaks is not installed; run: scripts/install-gitleaks.sh"
    return 1
  fi
  gitleaks git --redact --no-banner && gitleaks dir . --redact --no-banner
}

check "secrets: gitleaks" . secrets

check "server: lint" server npm run lint
check "server: formatting" server npm run format:check
check "server: typecheck" server npm run typecheck
check "server: tests" server npm test
check "server: audit" server npm audit --audit-level=high

check "client: lint" client npm run lint
check "client: formatting" client npm run format:check
check "client: typecheck" client npm run typecheck
check "client: tests" client npm test
check "client: audit" client npm audit --audit-level=high
check "client: build" client npx vite build

echo
echo "${bold}Summary${reset}"
printf '  %s\n' "${results[@]}"
echo

if ((failed)); then
  echo "${red}${bold}Checks failed.${reset} Fix the issues above before pushing."
  exit 1
fi
echo "${green}${bold}All checks passed.${reset}"
