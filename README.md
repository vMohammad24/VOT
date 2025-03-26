# VOT

## To install dependencies:

```bash
bun install
```

# Production

First you're gonna have to create a `.env.prod` file in the root directory. You can use the `.env.example` file as a template.

```
cp .env.example .env.prod
```

### Then, you can run the following command to build and start the containers:

```bash
docker compose --profile prod up -d
```

# Development:

First you're gonna have to create a `.env` file in the root directory. You can use the `.env.example` file as a template.

```
cp .env.example .env
```

### For services:

```bash
docker compose --profile dev up -d
```

### For the bot:

```bash
bun dev
```
