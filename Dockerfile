FROM oven/bun:debian
WORKDIR /home/vot

# Install dependencies as root
RUN apt-get update && apt-get install -y \
    curl gnupg \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable build-essential python3 -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs

# Create a non-root user
RUN useradd -m -u 1000 bun-user \
    && chown -R bun-user:bun-user /home/vot

# Switch to non-root user
USER bun-user

COPY --chown=bun-user:bun-user package.json ./
COPY --chown=bun-user:bun-user bun.lockb ./
RUN bun install
COPY --chown=bun-user:bun-user src ./src
COPY --chown=bun-user:bun-user prisma ./prisma
COPY --chown=bun-user:bun-user assets ./assets

EXPOSE 8080
CMD [ "bun", "start" ]