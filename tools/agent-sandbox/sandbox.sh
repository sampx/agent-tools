#!/bin/bash
set -e

# Wopal Agent Sandbox Runner
# Mounts a specific sub-project into a secured OpenCode Docker environment

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
IMAGE_NAME="wopal-agent-sandbox:latest"

show_help() {
    cat << EOF
Wopal Agent Sandbox CLI

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    run <project_path>  Run OpenCode in a sandboxed target project
    build               Build the Wopal Agent Sandbox Docker image
    auth                Run OpenCode authentication in the sandbox
    clean               Remove the Docker image
    help                Show this help message

Arguments for 'run':
    <project_path>   Path to the subproject or worktree (Must be inside wopal-workspace, but NOT the workspace root)

Examples:
    $0 run projects/python/flex-scheduler
    $0 run .worktrees/cli-feature-sandbox
EOF
}

find_workspace_root() {
    local dir="$(cd "$1" && pwd 2>/dev/null || echo "$PWD")"
    while [ "$dir" != "/" ] && [ ! -f "$dir/.workspace.md" ]; do
        dir="$(dirname "$dir")"
    done
    if [ "$dir" == "/" ]; then
        echo "Error: Could not find .workspace.md to determine workspace root." >&2
        return 1
    fi
    echo "$dir"
}

# Verifies that target is safe: exists, inside workspace, and is NOT the workspace root
validate_target_dir() {
    local target="$1"
    
    if [ ! -d "$target" ]; then
        echo "Error: Directory '$target' does not exist." >&2
        exit 1
    fi
    
    local abs_target="$(cd "$target" && pwd)"
    local ws_root
    if ! ws_root="$(find_workspace_root "$abs_target")"; then
        exit 1
    fi
    
    if [ "$abs_target" == "$ws_root" ]; then
        echo "Error: Mounting the workspace root is strictly prohibited! The sandbox must target a specific subproject." >&2
        exit 1
    fi

    if [[ ! "$abs_target" == "$ws_root"/* ]]; then
        echo "Error: Target directory '$abs_target' is outside the workspace root '$ws_root'." >&2
        exit 1
    fi
    
    echo "$abs_target"
}

build_image() {
    echo "Building $IMAGE_NAME..."
    docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"
}

clean_image() {
    if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        echo "Removing Docker image '$IMAGE_NAME'..."
        docker rmi "$IMAGE_NAME"
    else
        echo "Docker image '$IMAGE_NAME' does not exist."
    fi
}

run_auth() {
    if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        echo "Image not found. Building first..."
        build_image
    fi
    
    # Needs a volume to save auth
    mkdir -p "$HOME/.local/share/opencode"
    mkdir -p "$HOME/.config/opencode"
    
    docker run -it --rm --network host \
        -e "HOST_UID=$(id -u)" \
        -e "HOST_GID=$(id -g)" \
        -v "$HOME/.local/share/opencode:/home/coder/.local/share/opencode:rw" \
        -v "$HOME/.config/opencode:/home/coder/.config/opencode:rw" \
        "$IMAGE_NAME" opencode auth login
}

run_sandbox() {
    local target_dir="$1"
    if [ -z "$target_dir" ]; then
        echo "Error: Target directory is required."
        show_help
        exit 1
    fi
    shift
    
    local abs_target
    if ! abs_target="$(validate_target_dir "$target_dir")"; then
        echo "$abs_target" >&2
        exit 1
    fi
    echo "Starting Agent Sandbox isolated to: $abs_target"
    
    if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        echo "Image not found. Building first..."
        build_image
    fi
    
    # We should ensure ~/.local/share/opencode exists so agent maintains sessions/login per user
    mkdir -p "$HOME/.local/share/opencode"
    mkdir -p "$HOME/.config/opencode"
    
    local container_name="sandbox-$(basename "$abs_target")-$RANDOM"
    
    local -a container_cmd=()
    if [ $# -eq 0 ]; then
        container_cmd=(opencode)
    elif [[ "$1" == -* ]]; then
        container_cmd=(opencode "$@")
    else
        container_cmd=("$@")
    fi

    docker run -it --rm \
        --name "$container_name" \
        --network host \
        -e "HOST_UID=$(id -u)" \
        -e "HOST_GID=$(id -g)" \
        -e "TERM=${TERM:-xterm-256color}" \
        -v "$abs_target:/workspace:rw" \
        -v "$HOME/.local/share/opencode:/home/coder/.local/share/opencode:rw" \
        -v "$HOME/.config/opencode:/home/coder/.config/opencode:ro" \
        -v "/var/run/docker.sock:/var/run/docker.sock:rw" \
        "$IMAGE_NAME" "${container_cmd[@]}"
}

main() {
    local cmd="${1:-}"
    case "$cmd" in
        run)
            shift
            run_sandbox "$@"
            ;;
        build)
            build_image
            ;;
        auth)
            run_auth
            ;;
        clean)
            clean_image
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            echo "Unknown command: $cmd"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
