import { updateGuilds } from "../api";
import type { IListener } from "../handler/listenres";

export default {
    name: "Permission updater",
    description: "Listens for permission changes for the dashboard",
    execute: ({ client, prisma }) => {
        client.on("guildMemberUpdate", async (oldUser, user) => {
            updateGuilds(user.id, prisma)
        })
    }
} as IListener