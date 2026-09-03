#!/usr/bin/env bash
# Push every environment variable referenced by docker-compose.yaml to Coolify.
#
# Single source of truth for env sync, called by:
#   - .github/workflows/ci.yml   (before every production deploy)
#   - .github/workflows/sync-coolify-secrets.yml (manual re-sync)
#
# The variable list is DERIVED from docker-compose.yaml rather than hand-kept:
# adding a `${FOO}` reference to the compose file is enough to make FOO required.
# Any referenced variable that is unset in the calling environment aborts the
# run — deploying with a silently-missing secret is the failure mode this guards.
#
# Variables with a compose default (`${FOO:-bar}`) are optional and skipped when
# unset; Docker supplies the default at runtime.
#
# Required env: COOLIFY_URL, COOLIFY_TOKEN, COOLIFY_APPLICATION_UUID,
# plus every variable referenced by docker-compose.yaml.

set -euo pipefail

compose_file="${COMPOSE_FILE:-docker-compose.yaml}"

test -n "${COOLIFY_URL:-}" || { echo "::error::COOLIFY_URL is not set"; exit 1; }
test -n "${COOLIFY_TOKEN:-}" || { echo "::error::COOLIFY_TOKEN is not set"; exit 1; }
test -n "${COOLIFY_APPLICATION_UUID:-}" || {
  echo "::error::COOLIFY_APPLICATION_UUID is not set"
  exit 1
}
test -f "$compose_file" || { echo "::error::$compose_file not found"; exit 1; }

# Keys that carry a compose-level default are optional.
# Portable read loops (not `mapfile`) so the script runs on bash 3.2 too.
optional_keys=()
while IFS= read -r key; do
  [[ -n "$key" ]] && optional_keys+=("$key")
done < <(grep -oE '\$\{[A-Z0-9_]+:-' "$compose_file" | sed 's/^\${//; s/:-$//' | sort -u)

# SOURCE_COMMIT is supplied by Coolify for each deployment. Managing it as an
# application env creates a stale override that masks the current revision.
managed_keys=()
while IFS= read -r key; do
  [[ -n "$key" ]] && managed_keys+=("$key")
done < <(grep -oE '\$\{[A-Z0-9_]+' "$compose_file" | cut -c3- | sort -u | grep -v '^SOURCE_COMMIT$')

keys=("${managed_keys[@]}")

if [[ ${#keys[@]} -eq 0 ]]; then
  echo "::error::No managed \${VAR} references found in $compose_file — refusing to sync an empty set."
  exit 1
fi

# Remove a legacy application-level SOURCE_COMMIT override. Coolify injects
# this predefined variable per deployment; keeping a managed copy makes every
# later container report an old revision even when the image is current.
legacy_source_commit_uuid=$(curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $COOLIFY_TOKEN" \
  "$COOLIFY_URL/api/v1/applications/$COOLIFY_APPLICATION_UUID/envs" | \
  jq -r '.[] | select(.key == "SOURCE_COMMIT" and (.is_preview | not)) | .uuid' | \
  head -n 1)
if [[ -n "$legacy_source_commit_uuid" ]]; then
  curl --fail-with-body --silent --show-error \
    --request DELETE \
    --header "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_URL/api/v1/applications/$COOLIFY_APPLICATION_UUID/envs/$legacy_source_commit_uuid" \
    >/dev/null
  echo "Removed stale managed SOURCE_COMMIT; Coolify will inject the deployed revision."
fi

is_optional() {
  local candidate="$1" key
  for key in ${optional_keys[@]+"${optional_keys[@]}"}; do
    [[ "$key" == "$candidate" ]] && return 0
  done
  return 1
}

data='[]'
missing=0
synced=0
skipped=0

for key in "${keys[@]}"; do
  value="${!key:-}"
  if [[ -z "$value" ]]; then
    if is_optional "$key"; then
      echo "Skipping optional $key (compose default applies)."
      skipped=$((skipped + 1))
      continue
    fi
    echo "::error::$key is referenced by $compose_file but missing from the environment"
    missing=1
    continue
  fi
  data=$(jq \
    --arg key "$key" \
    --arg value "$value" \
    '. + [{key: $key, value: $value, is_runtime: true, is_buildtime: true}]' \
    <<<"$data")
  synced=$((synced + 1))
done

if [[ "$missing" != 0 ]]; then
  echo "::error::Refusing to sync a partial environment to Coolify."
  exit 1
fi

curl --fail-with-body --silent --show-error \
  --request PATCH \
  --header "Authorization: Bearer $COOLIFY_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$(jq -n --argjson data "$data" '{data: $data}')" \
  "$COOLIFY_URL/api/v1/applications/$COOLIFY_APPLICATION_UUID/envs/bulk" \
  >/dev/null

echo "Synced $synced variables to Coolify ($skipped optional skipped)."
