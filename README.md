# vot

To install dependencies:

```bash
bun install
```

First install:
Fix a .env

```bash
cp .env.example .env
```

Then run:

```bash
bunx prisma db push
```

To run (normally):

```bash
docker compose --profile prod up -d
```
