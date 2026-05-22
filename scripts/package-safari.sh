#!/usr/bin/env bash
set -euo pipefail

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "Safari packaging requires macOS and Xcode command line tools." >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required. Install Xcode command line tools first." >&2
  exit 1
fi

INPUT_DIR="${1:-.output/safari-mv3}"
PROJECT_DIR="${2:-build/safari}"
APP_NAME="${3:-YAP Lamp Design}"
EXTENSION_BUNDLE_ID="${4:-local.yap.lamp.design}"

if [[ ! -d "${INPUT_DIR}" ]]; then
  echo "Missing Safari build output: ${INPUT_DIR}" >&2
  echo "Run 'npm run build:safari' first." >&2
  exit 1
fi

mkdir -p "${PROJECT_DIR}"

xcrun safari-web-extension-packager \
  "${INPUT_DIR}" \
  --project-location "${PROJECT_DIR}" \
  --app-name "${APP_NAME}" \
  --bundle-identifier "${EXTENSION_BUNDLE_ID}"

echo "Safari wrapper project created in ${PROJECT_DIR}"

