FROM oven/bun:debian
WORKDIR /home/vot

RUN apt-get update && apt-get install -y \
    curl \
    libgobject-2.0-0 \
    libnss3 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxtst6 \
    libglib2.0-0 \
    libdbus-1-3 \
    libxrandr2 \
    libxss1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libatspi2.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libatk1.0-0 \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs
COPY package.json ./
COPY bun.lockb ./
COPY src ./src
COPY prisma ./prisma
COPY assets ./assets
RUN bun install
EXPOSE 8080
CMD [ "bun", "start" ]