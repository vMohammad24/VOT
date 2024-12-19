FROM oven/bun:debian
WORKDIR /home/vot

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    python3 \
    --no-install-recommends \
    && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable nodejs \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY bun.lockb ./
RUN bun install
COPY src ./src
COPY prisma ./prisma
COPY assets ./assets
EXPOSE 8080
CMD [ "bun", "start" ]