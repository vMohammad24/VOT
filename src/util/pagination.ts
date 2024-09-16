import {
    ActionRowBuilder,
    ActionRowData,
    APIActionRowComponent,
    APIMessageActionRowComponent,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
    JSONEncodable,
    Message,
    MessageActionRowComponentBuilder,
    MessageActionRowComponentData,
    MessagePayload,
    StringSelectMenuBuilder,
} from "discord.js";
import commandHandler from "..";
import { emojis } from "./emojis";

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

export async function pagination({ interaction, embeds, type, message }: PaginationOptions): Promise<void> {
    const { client } = commandHandler;
    if (!interaction && !message) {
        throw new Error('No interaction or message provided for pagination');
    }

    if (interaction && message) {
        throw new Error('Both interaction and message provided for pagination');
    }
    const id = Buffer.from(`${interaction ? interaction.id : message!.id}_${Date.now()}`).toString('base64');
    switch (type) {
        case 'buttons': {
            const arrowLeft = emojis.get('arrow_left')!;
            const arrowRight = emojis.get('arrow_right')!;
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
                messages.set(page, { embeds: [e], components: [row], files: attachments, content: name || '' });
                oldPage = page;
            }
            await interaction?.reply(messages.get(0) as InteractionReplyOptions);
            const sentMessage = await message?.reply(messages.get(0) as MessagePayload);
            const userId = interaction?.user.id || message?.author.id;
            client.on('interactionCreate', async (i) => {
                if (!i.isButton()) return;
                if (i.customId.startsWith(id)) {
                    if (i.user.id != userId) {
                        return i.reply({ content: 'This is not meant for you!', ephemeral: true });
                    }
                    const [_, action] = i.customId.split('_');
                    const page = parseInt(action);
                    const msg = messages.get(page);
                    if (!msg) return;
                    await i.update({});
                    if (interaction) {
                        await interaction.editReply(msg as InteractionReplyOptions);
                    } else {
                        await sentMessage!.edit(msg as MessagePayload);
                    }
                }
            })

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
                messages.set(page, { embeds: [e], components: [row], files: attachments, content: name || '' });
                oldPage = page;
            }
            await interaction?.reply(messages.get(0) as InteractionReplyOptions);
            const sentMessage = await message?.reply(messages.get(0) as MessagePayload);
            const userId = interaction?.user.id || message?.author.id;
            client.on('interactionCreate', async (i) => {
                if (!i.isStringSelectMenu()) return;
                if (i.customId == id) {
                    if (i.user.id != userId) {
                        return i.reply({ content: 'This is not meant for you!', ephemeral: true });
                    }
                    const page = parseInt(i.values[0]);
                    const msg = messages.get(page);
                    if (!msg) return;
                    await i.update({});
                    if (interaction) {
                        await interaction.editReply(msg as InteractionReplyOptions);
                    } else {
                        await sentMessage!.edit(msg as MessagePayload);
                    }
                }
            })
            break;
        }
        default: {
            throw new Error('Invalid pagination type provided');
        }
    }
}