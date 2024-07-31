import { pagination } from "@devraelfreeze/discordjs-pagination";
import { Embed, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Displays all commands",
    cooldown: 5000,
    execute: async ({ message, interaction, handler, channel, member }) => {
        const categories = handler.commands!.map(cmd => cmd.category).filter((value, index, self) => self.indexOf(value) === index).filter(cat => cat != "Developer").sort() as string[];
        const embeds = categories.map(category => {
            const commands = handler.commands!.filter(cmd => cmd.category === category).sort();
            return new EmbedBuilder()
                .setTitle(category)
                .setDescription(commands.filter(cmd => cmd.category === category).sort().map(cmd => `**${cmd.name}** - ${cmd.description}`).join("\n"))
                .setColor("Green")
                .setTimestamp()

        })
        await pagination({
            author: member.user,
            embeds: embeds as any as Embed[],
            interaction: interaction || undefined,
            message: message || undefined,
        })

    },

} as ICommand