import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import axios from "axios";

export default {
    name: "add",
    description: "Add a sticker/emoji to the guild",
    options: [
        {
            name: "type",
            description: "choose between stickers or emojis",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Stickers",
                    value: "stickers"
                },
                {
                    name: "Emojis",
                    value: "emojis"
                }
            ]
        },
        {
            name: "file",
            description: "file of the sticker/emoji",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        },
        {
            name: "name",
            description: "name of the sticker/emoji",
            type: ApplicationCommandOptionType.String,
            required: false,
            minLength: 2,
            maxLength: 32
        }
    ],
    perms: ["ManageEmojisAndStickers"],
    execute: async ({ guild, args, member }) => {
        const type = args.get("type") as string | undefined;
        const file = args.get("file") as Attachment | undefined;
        if (!file) {
            return {
                content: "No file provided",
                ephemeral: true
            }
        }
        if (!file.contentType?.startsWith("image")) {
            return {
                content: "File must be an image",
                ephemeral: true
            }
        }
        const name = (args.get("name") || file.name.trim().replace(/\.[^/.]+$/, "")) as string;
        const embed = new EmbedBuilder();
        switch (type) {
            case "stickers":
                embed.setTitle("Stickers")
                try {
                    await guild.stickers.create({
                        file: (await axios.get(file.url, {
                            responseType: "arraybuffer"
                        })).data,
                        name,
                        tags: name
                    })
                    embed.setDescription("Sticker added successfully")
                } catch (err) {
                    embed.setColor("Red")
                    embed.setDescription("Failed to add sticker (" + (err as any).message + ")")
                }
                break;
            case "emojis":
                embed.setTitle("Emojis")
                try {
                    await guild.emojis.create({
                        attachment: file.url,
                        name,
                        reason: `Added by ${member.user.username} (${member.user.id})`
                    })

                    embed.setDescription("Emoji added successfully")
                } catch (err) {
                    embed.setColor("Red")
                    embed.setDescription("Failed to add emoji (" + (err as any).message + ")")
                }
                break
            default:
                embed.setTitle("Invalid type")
                embed.setColor("Red")
                embed.setDescription("Type can either be stickers or emojis")
                break
        }
        if (!embed.data.color) embed.setColor("Green")
        return {
            embeds: [embed]
        }
    }
} as ICommand