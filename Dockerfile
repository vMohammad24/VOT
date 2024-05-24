FROM oven/bun:debian
WORKDIR /home/vot

RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs
COPY package.json ./
COPY bun.lockb ./
COPY src ./src
COPY prisma ./prisma
COPY .env ./
RUN bun install
EXPOSE 8080
CMD [ "bun", "start" ]