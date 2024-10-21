import { GuildTextBasedChannel } from "discord.js";
import { IListener } from "../handler/ListenerHandler";

export default {
    name: 'Sticky messages',
    description: 'Sticky messages',
    execute: async ({ client, prisma }) => {
        setInterval(async () => {
            const stickyMessages = await prisma.stickyMessage.findMany();
            await Promise.all(stickyMessages.map(async (stickyMessage) => {
                const channel = await client.channels.fetch(stickyMessage.channelId);
                if (!channel || !channel.isTextBased()) return;
                const textChannel = channel as GuildTextBasedChannel;
                const message = stickyMessage.messageId ? await textChannel.messages.fetch(stickyMessage.messageId).catch(() => null) : null;
                if (message && message.channel.lastMessageId == message.id) return;
                if (message && message.deletable) await message.delete();
                const newMessage = await textChannel.send(stickyMessage.content);
                // (await newMessage.pin()).delete();
                await prisma.stickyMessage.update({
                    where: { id: stickyMessage.id },
                    data: { messageId: newMessage.id }
                });
            }));
        }, 1000 * 60 * 2);
    }
} as IListener