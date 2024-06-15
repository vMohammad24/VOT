import { Prisma, PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { createPrismaRedisCache } from "prisma-redis-middleware";

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient()

const redis = new Redis({
    // host: 'localhost'
    host: process.env.NODE_ENV == 'production' ? 'redis' : 'localhost',
})
if (process.env.NODE_ENV != 'production') globalForPrisma.prisma = prisma


const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
    models: [
        { model: "User", excludeMethods: ["findMany"] },
    ],
    storage: { type: "redis", options: { client: redis as any, invalidation: { referencesTTL: 300 }, log: console } },
    cacheTime: 300,
    excludeModels: ["TicketSettings", "Ticket", "Discord", "Spotify", "WelcomeSettings"],
    excludeMethods: ["findUnique"],
    onHit: (key) => {
        console.log("hit", key);
    },
    onMiss: (key) => {
        console.log("miss", key);
    },
    onError: (key) => {
        console.log("error", key);
    },
});

prisma.$use(cacheMiddleware);
export default prisma;