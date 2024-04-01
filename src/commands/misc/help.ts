import { ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { Pagination, PaginationType, type PaginationItem } from "@discordx/pagination";

export default {
    description: "Displays all commands",
    cooldown: 5000,
    execute: async ({ message, interaction, handler, channel }) => {
        const categories = handler.commands!.map(cmd => cmd.category).filter((value, index, self) => self.indexOf(value) === index);
        const embeds: PaginationItem[] = categories.map(category => {
            const commands = handler.commands!.filter(cmd => cmd.category === category);
            return {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(category!)
                        .setDescription(commands.filter(cmd => cmd.category === category).map(cmd => `**${cmd.name}** - ${cmd.description}`).join("\n"))
                        .setColor("Green")
                        .setTimestamp()
                ],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                label: "Select",
                                style: ButtonStyle.Primary,
                                customId: "select-" + category,
                                emoji: {
                                    name: "🔍"
                                }
                            }
                        ]
                    }
                ]
            }
        })
        // embeds.push({ embeds: [new EmbedBuilder().setTitle('Help').setDescription('Select any category to view its commands').setColor('Random').setTimestamp()] })
        const cateogryNames = categories.map(category => category!);
        // cateogryNames.push('Help');
        const pag = await new Pagination(message ? message : interaction!, embeds, {
            type: PaginationType.SelectMenu,
            pageText: cateogryNames,
            showStartEnd: false,
            initialPage: 0,
        }).send();
    },

} as ICommand