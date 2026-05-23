#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

MODE="full"
COMMIT_FROM=""
COMMIT_TO=""

usage() {
  cat <<'EOF'
Usage: scripts/run-ci-checks.sh [options]

Options:
  --from <sha>         Commitlint range start.
  --to <sha>           Commitlint range end.
  --commitlint-only    Run only commit message checks.
  --verify-only        Run CI verify checks without commitlint.
  -h, --help           Show this help message.
EOF
}

while (($# > 0)); do
  case "$1" in
    --from)
      COMMIT_FROM="${2:?Missing value for --from}"
      shift 2
      ;;
    --to)
      COMMIT_TO="${2:?Missing value for --to}"
      shift 2
      ;;
    --commitlint-only)
      MODE="commitlint-only"
      shift
      ;;
    --verify-only)
      MODE="verify-only"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "$REPO_ROOT"

if [[ "$MODE" != "verify-only" && -z "$COMMIT_FROM" && -z "$COMMIT_TO" ]] && git rev-parse --verify HEAD >/dev/null 2>&1; then
  COMMIT_TO="$(git rev-parse HEAD)"

  if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    COMMIT_FROM="$(git rev-parse HEAD^)"
  else
    COMMIT_FROM="$(git rev-list --max-parents=0 HEAD)"
  fi
fi

echo "==> Installing dependencies"
npm ci

run_commitlint() {
  if [[ -z "$COMMIT_FROM" || -z "$COMMIT_TO" ]]; then
    echo "==> Skipping commitlint: no commit range available"
    return 0
  fi

  echo "==> Linting commit messages ($COMMIT_FROM..$COMMIT_TO)"
  npx commitlint --from "$COMMIT_FROM" --to "$COMMIT_TO" --verbose
}

run_verify_suite() {
  echo "==> Lint"
  npm run lint

  echo "==> Typecheck"
  npm run typecheck

  echo "==> Unit tests"
  npm run test:unit

  echo "==> Build all targets"
  npm run build

  echo "==> Firefox package lint"
  npm run lint:firefox
}

case "$MODE" in
  commitlint-only)
    run_commitlint
    ;;
  verify-only)
    run_verify_suite
    ;;
  full)
    run_commitlint
    run_verify_suite
    ;;
esac
