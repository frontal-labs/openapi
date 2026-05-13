#!/usr/bin/env bash
set -euo pipefail

# Frontal OpenAPI curl examples (from generated public routes)
# Endpoints used:
# - GET  /health
# - POST /v1/auth/signup
# - POST /v1/auth/login

API_BASE_URL="${FRONTAL_API_BASE_URL:-https://api.frontal.dev}"
EMAIL="${FRONTAL_TEST_EMAIL:-user@example.com}"
PASSWORD="${FRONTAL_TEST_PASSWORD:-ChangeMe123!}"

header() {
  echo
  echo "== $1 =="
}

header "1) Health check"
curl -sS -X GET "${API_BASE_URL}/health" | jq .

header "2) Signup"
curl -sS -X POST "${API_BASE_URL}/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "$(cat <<JSON
{
  \"email\": \"${EMAIL}\",
  \"password\": \"${PASSWORD}\",
  \"name\": \"Example User\"
}
JSON
)" | jq .

header "3) Login"
LOGIN_RESPONSE="$(curl -sS -X POST "${API_BASE_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "$(cat <<JSON
{
  \"email\": \"${EMAIL}\",
  \"password\": \"${PASSWORD}\"
}
JSON
)")"

echo "${LOGIN_RESPONSE}" | jq .

echo
echo "Done."
