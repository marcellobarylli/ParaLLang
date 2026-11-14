# Round 114: the hosted ParaLLang server (Render, or any host that runs a Docker image). It calls Claude through the
# owner's subscription with the claude-cli adapter. Secrets come from the host, never from this image:
#   CLAUDE_CODE_OAUTH_TOKEN  from `claude setup-token`
#   PARALLANG_TOKEN          the access token every /api request needs (16+ characters; the server refuses to start
#                            in production without it)
FROM node:22-bookworm-slim

# The Claude Code CLI, pinned to the version the adapter's preflight was last checked against (round 114). Its path is
# the adapter's CLAUDE_CLI_PATH setting.
ARG CLAUDE_CODE_VERSION=2.1.325
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} && npm cache clean --force

WORKDIR /app
# The root lockfile pins every workspace, so npm ci needs every workspace's manifest (aesthetic joined in round 115);
# only the server's production dependencies are installed.
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY aesthetic/package.json aesthetic/package.json
RUN npm ci --omit=dev --workspace server --include-workspace-root=false && npm cache clean --force

COPY server/server.js server/server.js
COPY server/src server/src
COPY content content
COPY prompts prompts

# Saves live under /data/saves; mount a persistent disk at /data to keep them across deploys.
RUN mkdir -p /data/saves && chown -R node:node /data
USER node
ENV NODE_ENV=production \
    LLM_PROVIDER=claude-cli \
    CLAUDE_CLI_PATH=/usr/local/bin/claude \
    TARGET_LANGUAGE=it \
    PARALLANG_SAVE_DIR=/data/saves \
    HOME=/home/node \
    PORT=10000
EXPOSE 10000
CMD ["node", "server/server.js"]
