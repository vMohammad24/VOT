FROM oven/bun:debian
WORKDIR /home/vot

RUN sudo apt-get autoclean && apt-get update && apt-get install -y \
    curl gnupg \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable build-essential python3 -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs
COPY package.json ./
COPY bun.lockb ./
RUN bun install
COPY src ./src
COPY prisma ./prisma
COPY assets ./assets
EXPOSE 8080
CMD [ "bun", "start" ]