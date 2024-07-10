import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { getPanel, getRows, sendPanel } from "../../util/music";

export default {
    description: "Adds a song to the queue",
    init: async ({ client, kazagumo }) => {
        client.on("interactionCreate", async (inter) => {
            if (inter.isAutocomplete()) {
                if (inter.commandName !== "play") return;
                const query = inter.options.getString("query");
                if (!query) return inter.respond([{ name: "Provide a query to continue", value: "" }])
                const results = await kazagumo.search(query, { requester: inter.member as GuildMember });
                const options = results.tracks.map((track, index) => ({
                    name: track.title,
                    value: track.uri!,
                }))
                try {
                    inter.respond(options)
                } catch (error) {
                    inter.respond([{ name: "An error has occured", value: "" }])
                }
            }
        })
    },
    options: [
        {
            name: "query",
            description: "The song you want to play",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        }
    ],
    aliases: ["p"],
    needsPlayer: true,
    execute: async ({ player, handler, guild, member, args }) => {
        const { kazagumo } = handler;
        if (!player) return { content: "Get in a voice channel first", ephemeral: true }
        const query = args.get("query") as string;
        if (!query) {
            player.play();
            return {
                content: "No query provided",
                ephemeral: true
            }
        }
        const embed = new EmbedBuilder()
            .setTitle("Added to queue")
            .setColor("Green");
        await kazagumo.search(query, { requester: member as GuildMember }).then(async (res) => {
            switch (res.type) {
                case "TRACK":
                    player!.queue.add(res.tracks[0]);
                    embed.setDescription(`Added ${res.tracks[0].title || "Error getting title"} to the queue`);
                    break;
                case "SEARCH":
                    player!.queue.add(res.tracks[0]);
                    embed.setDescription(`Added ${res.tracks[0].title || "Error getting title"} to the queue`);
                    break;
                case "PLAYLIST":
                    player!.queue.add(res.tracks)
                    embed.setTitle("Added Playlist to queue.");
                    embed.setColor("Orange");
                    let duration: number = 0;
                    res.tracks.forEach((e) => {
                        duration += e.length!;
                    });
                    embed.setDescription(
                        `Added ${res.playlistName
                        } to the queue that will finish <t:${Math.round(Date.now() / 1000 + duration / 1000)}:R>`
                    );
                    break;
                default:
                    break;
            }
        });;
        embed.setDescription(`${embed.data.description}\n\nGo to <#${member.voice.channelId}> to manage the queue`);
        if (!player.playing) player.play();
        return {
            embeds: [embed],
            ephemeral: true
        }
    }
} as ICommand