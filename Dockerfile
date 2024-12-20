FROM oven/bun:debian AS base
WORKDIR /usr/src/app

# Install Chrome and dependencies
RUN apt-get update && apt-get install -y \
    curl gnupg build-essential python3 \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Production
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY src ./src
COPY prisma ./prisma
COPY assets ./assets
COPY package.json .
COPY bun.lockb .

USER bun
EXPOSE 8080
CMD [ "bun", "start" ]