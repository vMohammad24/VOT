# VOT

## To install dependencies:

```bash
bun install
```

## First install:

Fix a .env

```bash
cp .env.example .env
```

Then run:

```bash
bunx prisma db push
```

# Production

```bash
docker compose --profile prod up -d
```

# Development:

### For services:

```bash
docker compose --profile dev up -d
```

### For the bot:

```bash
bun dev
```
