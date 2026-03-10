# Use Debian slim as lightweight Linux base
FROM debian:bookworm-slim

ARG NVM_VERSION=v0.40.1
ARG GO_VERSION=1.23.4

# Install base dependencies
RUN apt-get update && apt-get install -y \
    git curl bash ca-certificates sudo zip unzip wget gnupg \
    lsb-release apt-transport-https software-properties-common \
    ripgrep fd-find jq tree less procps tmux lsof \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI using Debian repository due to network restrictions
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash -u 1000 coder && \
    echo "coder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to coder user for sdk installations
USER coder
WORKDIR /home/coder

# Install NVM and Node.js LTS
ENV NVM_DIR="/home/coder/.nvm"
RUN curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash && \
    bash -c "source $NVM_DIR/nvm.sh && \
    nvm install --lts && \
    nvm alias default node && \
    nvm use default && \
    ln -sf \$(dirname \$(which node)) $NVM_DIR/default"

# Install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Go
USER root
RUN curl -OL https://golang.google.cn/dl/go${GO_VERSION}.linux-$(dpkg --print-architecture).tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-$(dpkg --print-architecture).tar.gz && \
    rm go${GO_VERSION}.linux-$(dpkg --print-architecture).tar.gz
USER coder
ENV GOPATH="/home/coder/go"

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/home/coder/.bun"

# Install ast-grep
RUN bash -c "source $NVM_DIR/nvm.sh && npm install -g @ast-grep/cli"

# Setup PATH
ENV PATH="/usr/local/go/bin:$GOPATH/bin:$BUN_INSTALL/bin:$NVM_DIR/default:/home/coder/.local/bin:$PATH"

# Install OpenCode
ARG OPENCODE_BUILD_TIME=0
RUN bash -c "source $NVM_DIR/nvm.sh && npm install -g opencode-ai@latest"

USER root
# Create necessary caching/config directories
RUN mkdir -p /home/coder/.config/opencode \
    /home/coder/.local/share/opencode \
    /home/coder/.cache/opencode \
    /home/coder/.cache/oh-my-opencode \
    /home/coder/.npm \
    /home/coder/go \
    && chown -R coder:coder /home/coder

WORKDIR /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["opencode"]
