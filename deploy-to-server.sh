#!/usr/bin/env bash
set -euo pipefail

REMOTE_SSH="${REMOTE_SSH:-root@67.205.138.129}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/zagreb.lol/liga}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

echo "Deploying ${SOURCE_DIR} -> ${REMOTE_SSH}:${REMOTE_DIR}"

ssh -i "$SSH_KEY" "$REMOTE_SSH" "mkdir -p '$REMOTE_DIR'"

rsync -avz --delete --chmod=Fu=rw,Fgo=r,Du=rwx,Dgo=rx \
  --exclude "$SCRIPT_NAME" \
  --exclude ".git/" \
  --exclude ".DS_Store" \
  --exclude "*.md" \
  -e "ssh -i $SSH_KEY" \
  "$SOURCE_DIR/" "$REMOTE_SSH:$REMOTE_DIR/"

ssh -i "$SSH_KEY" "$REMOTE_SSH" \
  "find '$REMOTE_DIR' -type d -exec chmod 755 {} + && find '$REMOTE_DIR' -type f -exec chmod 644 {} +"

echo "Deploy complete."