FROM oven/bun:debian
WORKDIR /home/vot

# Install basic dependencies
RUN apt-get update -o Acquire::ForceIPv4=true && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

RUN  apt-get update && \
    apt-get install -y \
    chromium \
    build-essential \
    python3 \
    python3-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 bun-user \
    && chown -R bun-user:bun-user /home/vot \
    && mkdir -p /home/vot/node_modules/.prisma \
    && chown -R bun-user:bun-user /home/vot/node_modules

USER bun-user

COPY --chown=bun-user:bun-user package.json bun.lockb ./
RUN bun install

COPY --chown=bun-user:bun-user . .


RUN bunx prisma generate

EXPOSE 8080

CMD [ "bun", "run", "start" ]
