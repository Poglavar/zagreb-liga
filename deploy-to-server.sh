#!/usr/bin/env bash
set -euo pipefail

REMOTE_SSH="${REMOTE_SSH:-root@67.205.138.129}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/zagreb.lol/liga}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Load Cloudflare credentials (CF_ZONE_ID, CF_API_KEY)
if [ -f "$SOURCE_DIR/.env" ]; then
    set -a; source "$SOURCE_DIR/.env"; set +a
fi

echo "Deploying ${SOURCE_DIR} -> ${REMOTE_SSH}:${REMOTE_DIR}"

ssh -i "$SSH_KEY" "$REMOTE_SSH" "mkdir -p '$REMOTE_DIR'"

rsync -avz --delete --chmod=Fu=rw,Fgo=r,Du=rwx,Dgo=rx \
  --exclude "$SCRIPT_NAME" \
  --exclude ".git/" \
  --exclude ".claude/" \
  --exclude ".DS_Store" \
  --exclude "*.md" \
  --exclude "emblems/original/" \
  --exclude "original-usporedbe-gradova-logo.png" \
  -e "ssh -i $SSH_KEY" \
  "$SOURCE_DIR/" "$REMOTE_SSH:$REMOTE_DIR/"

ssh -i "$SSH_KEY" "$REMOTE_SSH" \
  "find '$REMOTE_DIR' -type d -exec chmod 755 {} + && find '$REMOTE_DIR' -type f -exec chmod 644 {} +"

echo "Purging Cloudflare cache..."
result=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')
if echo "$result" | python3 -c "import sys,json; r=json.load(sys.stdin); sys.exit(0 if r['success'] else 1)" 2>/dev/null; then
    echo "Cache purged OK."
else
    echo "Cache purge failed: $result"
    exit 1
fi

echo "Deploy complete."