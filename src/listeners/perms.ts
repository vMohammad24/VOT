import { updateGuilds } from "../api";
import type { IListener } from "../handler/listenres";

export default {
    name: "perms",
    description: "Listens for permission changes for the dashboard",
    execute: ({ client, prisma }) => {
        client.on("guildMemberUpdate", async (oldUser, user) => {
            updateGuilds(user.id)
        })
    }
} as IListener