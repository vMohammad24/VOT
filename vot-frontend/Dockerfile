# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:debian as base
WORKDIR /usr/src/app

FROM base AS prerelease
COPY ./.next .

ENV NODE_ENV=production
USER bun
EXPOSE 3000
ENV PORT 3000
CMD HOSTNAME="0.0.0.0" bun run ./standalone/server.js