# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:latest as base
WORKDIR /usr/src/vot
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
# copy production dependencies and source code into final image
FROM base AS release
USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "prod" ]
