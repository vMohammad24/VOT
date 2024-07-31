import { Prisma, PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { createPrismaRedisCache } from "prisma-redis-middleware";

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient()

const redis = new Redis({
    // host: 'localhost'
    host: import.meta.env.NODE_ENV == 'production' ? 'redis' : 'localhost',
})
if (import.meta.env.NODE_ENV != 'production') globalForPrisma.prisma = prisma


const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
    storage: { type: "redis", options: { client: redis as any, invalidation: { referencesTTL: 300 } } },
    cacheTime: 300,
    excludeMethods: ["findUnique"],
    excludeModels: ["Spotify"],
    onError: (key) => {
        console.error("error", key);
    },
});

prisma.$use(cacheMiddleware);
export default prisma;