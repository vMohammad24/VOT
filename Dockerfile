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

# Create non-root user and set permissions
RUN useradd -m -u 1001 bun-user \
    && chown -R bun-user:bun-user /home/vot \
    && mkdir -p /home/vot/node_modules/.prisma \
    && chown -R bun-user:bun-user /home/vot/node_modules

USER bun-user

COPY --chown=bun-user:bun-user package.json bun.lockb ./
RUN bun install

COPY --chown=bun-user:bun-user . .

# Generate Prisma client during build
RUN bunx prisma generate

EXPOSE 8080

# Modify the CMD to not include prisma generate
CMD [ "bun", "run", "start" ]