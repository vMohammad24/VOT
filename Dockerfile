FROM oven/bun:debian
WORKDIR /home/vot


RUN echo "nameserver 1.1.1.1" > /etc/resolv.conf && \
    echo "nameserver 1.0.0.1" >> /etc/resolv.conf

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

    
RUN curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y \
    google-chrome-stable \
    build-essential \
    python3 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

    
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

# Generate Prisma client during build
RUN bunx prisma generate

EXPOSE 8080

# Modify the CMD to not include prisma generate
CMD [ "bun", "run", "start" ]