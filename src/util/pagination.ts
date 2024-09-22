import {
    ActionRowBuilder,
    ActionRowData,
    APIActionRowComponent,
    APIMessageActionRowComponent,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    JSONEncodable,
    Message,
    MessageActionRowComponentBuilder,
    MessageActionRowComponentData,
    MessagePayload,
    StringSelectMenuBuilder,
} from "discord.js";
import commandHandler from "..";
import { getEmoji } from "./emojis";

interface PaginationOptions {
    embeds: {
        embed: EmbedBuilder
        attachments?: Buffer[];
        rows?: | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
        | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>
        | APIActionRowComponent<APIMessageActionRowComponent>;
        name?: string
        page?: number;
    }[],
    type: 'buttons' | 'select',
    interaction?: ChatInputCommandInteraction | null,
    message?: Message<boolean> | null,
    id?: string,
}

export async function pagination({ interaction, embeds, type, message }: PaginationOptions): Promise<Message> {
    const { client } = commandHandler;
    if (!interaction && !message) {
        throw new Error('No interaction or message provided for pagination');
    }

    if (interaction && message) {
        throw new Error('Both interaction and message provided for pagination');
    }
    const id = Buffer.from(`${interaction ? interaction.id : message!.id}_${Date.now()}`).toString('base64');
    if (embeds.length > 25 && type == 'select') type = 'buttons';
    switch (type) {
        case 'buttons': {
            const arrowLeft = getEmoji('arrow_left')!;
            const arrowRight = getEmoji('arrow_right')!;
            if (!arrowLeft || !arrowRight) throw new Error('Arrow emojis not found');
            const messages = new Map<number, InteractionReplyOptions | MessagePayload>(); // page, message
            let oldPage = 0;
            for (const embed of embeds) {
                const { embed: e, name, attachments, rows } = embed;
                let { page } = embed;
                if (!page) {
                    if (messages.has(0)) {
                        page = oldPage + 1;
                    } else {
                        page = 0;
                    }
                }
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${id}_${page - 1}`)
                        .setEmoji(arrowLeft.id)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId(`${id}_${page + 1}`)
                        .setEmoji(arrowRight.id)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === embeds.length - 1)
                )
                messages.set(page, { embeds: [e], components: rows ? [row, ...(rows as any)] : [row], files: attachments, content: name || '' });
                oldPage = page;
            }
            const sentMessage = message ? await message?.reply(messages.get(0) as MessagePayload) : (interaction?.deferred ? await interaction?.editReply(messages.get(0) as InteractionReplyOptions) : await interaction?.reply(messages.get(0) as InteractionReplyOptions));
            const userId = interaction?.user.id || message?.author.id;
            const collector = sentMessage?.createMessageComponentCollector({ filter: (i) => i.isButton() && i.customId.startsWith(id) && i.user.id == userId, time: 60000 });

            collector?.on('collect', async (i) => {
                const [_, action] = i.customId.split('_');
                const page = parseInt(action);
                const msg = messages.get(page);
                if (!msg) return;
                await i.update({});
                interaction ? interaction.editReply(msg as InteractionEditReplyOptions) : sentMessage?.edit(msg as MessagePayload);
            });

            collector?.on('end', async (_, reason) => {
                if (reason == 'time')
                    interaction ? interaction.editReply({ components: [] }) : sentMessage?.edit({ components: [] });
            })

            if (!sentMessage) {
                throw new Error('Failed to send the message');
            }
            return sentMessage as Message;
            break;
        }
        case 'select': {
            const messages = new Map<number, InteractionReplyOptions | MessagePayload>(); // page, message
            let oldPage = 0;
            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(id)
                    .setPlaceholder('Select a page')
                    .addOptions(embeds.map((e, i) => ({
                        label: e.name || `Page ${i + 1}`,
                        value: i.toString(),
                    }))
                    )
            )
            for (const embed of embeds) {
                const { embed: e, name, attachments, rows } = embed;

                let { page } = embed;
                if (!page) {
                    if (messages.has(0)) {
                        page = oldPage + 1;
                    } else {
                        page = 0;
                    }
                }
                messages.set(page, { embeds: [e], components: rows ? [row, ...(rows as any)] : [row], files: attachments, content: name || '' });
                oldPage = page;
            };
            const sentMessage = message ? await message?.reply(messages.get(0) as MessagePayload) : await interaction?.reply(messages.get(0) as InteractionReplyOptions);
            const userId = message ? message.author.id : interaction?.user.id;
            const collector = sentMessage?.createMessageComponentCollector({ filter: (i) => i.isStringSelectMenu() && i.customId == id && i.user.id == userId, time: 60000 });

            collector?.on('collect', async (i) => {
                if (!i.isStringSelectMenu()) return;
                const page = parseInt(i.values[0]);
                const msg = messages.get(page);
                if (!msg) return;
                await i.update({});
                interaction ? interaction.editReply(msg as InteractionEditReplyOptions) : sentMessage?.edit(msg as MessagePayload);
            });

            collector?.on('end', async (_, reason) => {
                if (reason == 'time')
                    interaction ? interaction.editReply({ components: [] }) : sentMessage?.edit({ components: [] });
            })
            return sentMessage as Message;
            break;
        }
        default: {
            throw new Error('Invalid pagination type provided');
        }
    }
}