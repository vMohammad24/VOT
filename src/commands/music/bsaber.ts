import axios from "axios";
import type ICommand from "../../handler/interfaces/ICommand";
import { searchSaver } from "../../util/beatsaver";
import { Pagination, PaginationType, type PaginationItem } from "@discordx/pagination";
import { EmbedBuilder } from "@discordjs/builders";
import { ComponentType, ButtonStyle } from "discord.js";

export default {
    name: "bsaber",
    description: "Get a beat saber map for the currently playing song",
    needsPlayer: true,
    aliases: ["bs", "beatsaver"],
    execute: async ({ interaction, player, message }) => {
        const song = player?.queue.current;
        if (!song) return { content: "No song is currently playing", ephemeral: true };

        try {
            const res = await searchSaver(`${song.title}`, "Rating");
            if (typeof res === "string") return { content: res, ephemeral: true };

            res.sort((a, b) => b.stats.score - a.stats.score);
            // sort by relevance
            res.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const songTitle = song.title.toLowerCase();
                return aName === songTitle ? -1 : bName === songTitle ? 1 : 0;
            });
            if (res.length === 0) return { content: "No maps found for this song", ephemeral: true };
            const items: PaginationItem[] = res.map((map, index) => {
                // Log the map object to inspect its structure

                const latestVersion = map.versions[map.versions.length - 1];

                // Check for undefined values and provide default values or skip
                const mapName = map.name ?? "Unknown";
                const description = map.description ?? "No description available.";
                const uploaderName = map.uploader?.name ?? "Unknown uploader";
                const plays = map.stats?.plays?.toString() ?? "0";
                const downloads = map.stats?.downloads?.toString() ?? "0";
                const rating = map.stats?.score?.toString() ?? "N/A";
                const sentiment = map.stats?.sentiment ?? "N/A";
                const coverURL = latestVersion.coverURL ?? "";
                const downloadURL = latestVersion.downloadURL ?? "";
                const oneClickURL = `beatsaver://${map.id}`;
                const previewURL = latestVersion.previewURL ?? "";
                const avatarURL = map.uploader?.avatar ?? "";

                return {
                    content: `One click: ${oneClickURL}`,
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(mapName)
                            .setDescription(description.slice(0, 200) + (description.length > 200 ? "..." : ""))
                            .setFields([
                                { name: "Mapper", value: uploaderName, inline: true },
                                { name: "Plays", value: plays, inline: true },
                                { name: "Downloads", value: downloads, inline: true },
                                { name: "Rating", value: rating, inline: true },
                                { name: "Sentiment", value: sentiment, inline: true },
                            ])
                            .setThumbnail(coverURL)
                            .setFooter({ text: `Mapped by ${uploaderName} • ${rating} rating`, iconURL: avatarURL })
                            .setTimestamp()
                            .setColor([0, 255, 0])
                    ],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.Button,
                                    label: "Download",
                                    style: ButtonStyle.Link,
                                    url: downloadURL,
                                },
                                {
                                    type: ComponentType.Button,
                                    label: "Preview",
                                    style: ButtonStyle.Link,
                                    url: previewURL,
                                }
                            ]
                        }
                    ]
                };
            });
            const mapNames = res.map((map) => map.name);
            await new Pagination(message ? message : interaction!, items, {
                type: PaginationType.SelectMenu,
                pageText: mapNames,
                showStartEnd: false,
            }).send();
        } catch (error) {
            console.error("An error occurred while executing the bsaber command:", error);
            return { content: "An error occurred while fetching the beat map.", ephemeral: true };
        }
    },
} as ICommand;
