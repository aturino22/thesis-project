#!/bin/bash
set -uo pipefail

if [ -z "${KEYCLOAK_ADMIN:-}" ]; then
  KEYCLOAK_ADMIN=admin
fi
if [ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]; then
  KEYCLOAK_ADMIN_PASSWORD=admin
fi

echo "Waiting for Keycloak to accept admin connections..."
while true; do
  if /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://keycloak:8080 \
    --realm master \
    --user "$KEYCLOAK_ADMIN" \
    --password "$KEYCLOAK_ADMIN_PASSWORD"; then
    break
  fi
  sleep 5
done

CLIENT_UUID=$(
  /opt/keycloak/bin/kcadm.sh get clients -r thesis -q clientId=frontend \
    | sed -n 's/  "id" : "\(.*\)",/\1/p' \
    | head -n 1
)

if [ -z "$CLIENT_UUID" ]; then
  echo "Unable to detect frontend client ID"
  exit 1
fi

POST_LOGOUT_URIS=$'http://localhost:5173/*\nhttp://localhost:5173/\nhttp://localhost:5173\nhttp://localhost:5173/auth/logout\nhttp://localhost:3000/*\nhttp://localhost:3000/\nhttp://localhost:3000\nhttp://localhost:3000/auth/logout\nhttps://fintechwallet.it/*\nhttps://fintechwallet.it/\nhttps://fintechwallet.it\nhttps://fintechwallet.it/auth/logout\nhttps://www.fintechwallet.it/*\nhttps://www.fintechwallet.it/\nhttps://www.fintechwallet.it\nhttps://www.fintechwallet.it/auth/logout'

/opt/keycloak/bin/kcadm.sh update clients/"$CLIENT_UUID" \
  -r thesis \
  -s "attributes.post.logout.redirect.uris=$POST_LOGOUT_URIS"

echo "Frontend client post logout redirect updated."
