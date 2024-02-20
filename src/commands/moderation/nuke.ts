import { EmbedBuilder, type BaseGuildTextChannel, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Nukes a channel",
    perms: ["ManageChannels", "ManageMessages", "ManageGuild"],
    execute: async ({ channel, guild, member }) => {
        const c = channel as BaseGuildTextChannel;
        if (!c) {
            return "Please provide a valid channel";
        }
        await c
            .clone({ reason: "Nuked", name: c.name })
            .then(async (ch) => {
                c.delete("Nuked");
                const embed = new EmbedBuilder()
                    .setTitle("Nuked")
                    .setDescription(`Channel ${c.name} has been nuked`)
                    .setColor("Random")
                    .setTimestamp(Date.now())
                    .setFooter({ text: `Nuked by ${member.displayName}`, iconURL: member.user.displayAvatarURL() })
                    .setImage("https://c.tenor.com/jkRrt2SrlMkAAAAC/pepe-nuke.gif");
                await ch.send({ embeds: [embed] });
            })
            .catch((err) => {
                return err;
            });
    },

} as ICommand