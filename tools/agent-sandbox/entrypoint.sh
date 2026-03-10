#!/bin/bash
set -e

# Fix Docker socket permissions if mounted from host
if [ -S /var/run/docker.sock ]; then
    DOCKER_SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
    if ! getent group "$DOCKER_SOCK_GID" >/dev/null 2>&1; then
        groupadd -g "$DOCKER_SOCK_GID" docker_host 2>/dev/null || true
    fi
    usermod -aG "$DOCKER_SOCK_GID" coder 2>/dev/null || true
fi

TARGET_UID=${HOST_UID:-1000}
TARGET_GID=${HOST_GID:-1000}

CURRENT_UID=$(id -u coder)
CURRENT_GID=$(id -g coder)

if [ "$TARGET_UID" != "$CURRENT_UID" ] || [ "$TARGET_GID" != "$CURRENT_GID" ]; then
    if [ "$TARGET_GID" != "$CURRENT_GID" ]; then
        groupmod -g "$TARGET_GID" coder 2>/dev/null || true
    fi
    if [ "$TARGET_UID" != "$CURRENT_UID" ]; then
        usermod -u "$TARGET_UID" coder 2>/dev/null || true
    fi

    # Fix ownership of essential home directory contents
    chown "$TARGET_UID:$TARGET_GID" /home/coder 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/.config 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/.local 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/.cache 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/.npm 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/go 2>/dev/null || true
    chown -R "$TARGET_UID:$TARGET_GID" /home/coder/.bun 2>/dev/null || true
    chown "$TARGET_UID:$TARGET_GID" /home/coder/.nvm 2>/dev/null || true
fi

# Do not touch /workspace (mounted from host, let host permissions take over)

export HOME=/home/coder
export USER=coder
export NVM_DIR="/home/coder/.nvm"

exec setpriv --reuid="$TARGET_UID" --regid="$TARGET_GID" --init-groups \
    bash -c "source \$NVM_DIR/nvm.sh 2>/dev/null || true && exec \"\$@\"" \
    -- "$@"
