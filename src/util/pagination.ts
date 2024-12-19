import {
	ActionRowBuilder,
	APISelectMenuOption,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionEditReplyOptions,
	InteractionReplyOptions,
	Message,
	MessageEditOptions,
	MessageReplyOptions,
	SelectMenuComponentOptionData,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from 'discord.js';
import { getEmoji } from './emojis';

export interface PaginationPage {
	page: InteractionReplyOptions | MessageReplyOptions | EmbedBuilder;
	name?: string;
	pageNumber?: number;
	emoji?: string;
	description?: string;
}

export interface PaginationOptions {
	pages: PaginationPage[];
	type?: 'buttons' | 'select' | 'multipleSelect';
	interaction?: ChatInputCommandInteraction | null;
	message?: Message<boolean> | null;
	rMsg?: Message<boolean>;
	id?: string;
	name?: string;
}

export async function pagination({
	interaction,
	pages,
	type,
	message,
	rMsg,
	name,
}: PaginationOptions): Promise<Message> {
	if (!interaction && !message) {
		throw new Error('No interaction or message provided for pagination');
	}

	if (interaction && message) {
		throw new Error('Both interaction and message provided for pagination');
	}

	const id = Buffer.from(`${interaction ? interaction.id : message!.id}_${Date.now()}`).toString('base64');
	if (!type) type = 'buttons';

	if (type === 'select' && pages.length > 25) {
		type = 'buttons';
	}

	switch (type) {
		case 'buttons': {
			const arrowLeft = getEmoji('arrow_left')!;
			const arrowRight = getEmoji('arrow_right')!;
			if (!arrowLeft || !arrowRight) throw new Error('Arrow emojis not found');
			const messages = new Map<number, InteractionReplyOptions | MessageReplyOptions>();
			let oldPage = 0;
			for (const embed of pages) {
				const { page: e } = embed;
				let { pageNumber: page } = embed;
				if (page === undefined || page === null) {
					if (messages.has(0)) {
						page = oldPage + 1;
					} else {
						page = 0;
					}
				}
				if (pages.length > 1) {
					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(`${id}_${page - 1}`)
							.setEmoji(arrowLeft.id)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page === 0),
						new ButtonBuilder()
							.setCustomId(`${id}_coolahhbutton`)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(true)
							.setLabel(`${page + 1}/${pages.length}`),
						new ButtonBuilder()
							.setCustomId(`${id}_${page + 1}`)
							.setEmoji(arrowRight.id)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page === pages.length - 1),
					);
					if (e instanceof EmbedBuilder) {
						messages.set(page, { embeds: [e as EmbedBuilder], components: [row] });
					} else {
						e.components ? (e.components = [row, ...e.components]) : (e.components = [row]);
						messages.set(page, e as InteractionReplyOptions | MessageReplyOptions);
					}
				} else {
					if (e instanceof EmbedBuilder) {
						messages.set(page, { embeds: [e as EmbedBuilder] });
					} else {
						messages.set(page, e as InteractionReplyOptions | MessageReplyOptions);
					}
				}
				oldPage = page;
			}
			const sentMessage = message
				? await (rMsg
					? rMsg.edit(messages.get(0) as MessageEditOptions)
					: message?.reply(messages.get(0) as MessageReplyOptions))
				: interaction?.deferred
					? await interaction?.editReply(messages.get(0) as InteractionReplyOptions)
					: await interaction?.reply(messages.get(0) as InteractionReplyOptions);
			const userId = interaction?.user.id || message?.author.id;
			const collector = sentMessage?.createMessageComponentCollector({
				filter: (i) => i.isButton() && i.customId.startsWith(id) && i.user.id == userId,
				time: 60_000 * 60,
			});

			collector?.on('collect', async (i) => {
				const [_, action] = i.customId.split('_');
				const page = parseInt(action);
				const msg = messages.get(page);
				if (!msg) return;
				await i.update({});
				interaction ? interaction.editReply(msg as InteractionEditReplyOptions) : sentMessage?.edit(msg as any);
			});

			collector?.on('end', async (_, reason) => {
				if (reason == 'time')
					interaction ? interaction.editReply({ components: [] }) : sentMessage?.edit({ components: [] });
			});

			if (!sentMessage) {
				throw new Error('Failed to send the message');
			}
			return sentMessage as Message;
			break;
		}
		case 'select': {
			if (pages.length > 25) {
				throw new Error('Select type supports up to 25 pages. Use multipleSelect for more pages.');
			}
			const messages = new Map<number, InteractionReplyOptions | MessageReplyOptions>();
			const options: (StringSelectMenuOptionBuilder | SelectMenuComponentOptionData | APISelectMenuOption)[] =
				pages.map((e, index) => ({
					label: e.name || `Page ${index + 1}`,
					value: index.toString(),
					emoji: e.emoji,
					description: e.description,
				}));
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(`${id}`)
				.setPlaceholder(pages[0].name ?? 'Select a page')
				.addOptions(options);

			const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

			pages.forEach((embed, index) => {
				const { page: e } = embed;
				const page = index;
				if (e instanceof EmbedBuilder) {
					messages.set(page, { embeds: [e as EmbedBuilder], components: [actionRow] });
				} else {
					const combinedRows = [actionRow, ...(e.components || [])];
					e.components = combinedRows;
					messages.set(page, e as InteractionReplyOptions | MessageReplyOptions);
				}
			});

			const sentMessage = message
				? await (rMsg
					? rMsg.edit(messages.get(0) as MessageEditOptions)
					: message?.reply(messages.get(0) as MessageReplyOptions))
				: interaction?.deferred
					? await interaction?.editReply(messages.get(0) as InteractionReplyOptions)
					: await interaction?.reply(messages.get(0) as InteractionReplyOptions);
			const userId = interaction?.user.id || message?.author.id;
			const collector = sentMessage?.createMessageComponentCollector({
				filter: (i) => i.isStringSelectMenu() && i.customId === id && i.user.id == userId,
				time: 60_000 * 60,
			});

			collector?.on('collect', async (i) => {
				if (!i.isStringSelectMenu()) return;
				const page = parseInt(i.values[0]);
				const msg = messages.get(page);
				if (!msg) return;
				await i.update({});
				const newPlaceholder = pages[page].name ?? `Page ${page + 1}`;
				selectMenu.setPlaceholder(newPlaceholder);
				interaction ? interaction.editReply(msg as InteractionEditReplyOptions) : sentMessage?.edit(msg as any);
			});

			collector?.on('end', async (_, reason) => {
				if (reason == 'time')
					interaction ? interaction.editReply({ components: [] }) : sentMessage?.edit({ components: [] });
			});
			return sentMessage as Message;
			break;
		}
		case 'multipleSelect': {
			const messages = new Map<number, InteractionReplyOptions | MessageReplyOptions>();
			pages.forEach((embed, index) => {
				const { page: e } = embed;
				const page = index;
				if (e instanceof EmbedBuilder) {
					messages.set(page, { embeds: [e as EmbedBuilder] });
				} else {
					messages.set(page, e as InteractionReplyOptions | MessageReplyOptions);
				}
			});

			const selectMenus = [];
			const selectMenuCount = Math.ceil(pages.length / 25);

			for (let i = 0; i < selectMenuCount; i++) {
				const start = i * 25;
				const end = Math.min(start + 25, pages.length);
				const options: (StringSelectMenuOptionBuilder | SelectMenuComponentOptionData | APISelectMenuOption)[] =
					pages.slice(start, end).map((e, index) => ({
						label: e.name || `Page ${start + index + 1}`,
						value: (start + index).toString(),
						emoji: e.emoji,
						description: e.description,
					}));

				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId(`${id}_${i}`)
					.setPlaceholder(name ? `${name} (${i + 1}/${selectMenuCount})` : `Select a page (${i + 1}/${selectMenuCount})`)
					.addOptions(options);

				selectMenus.push(selectMenu);
			}

			const actionRows = selectMenus.map((selectMenu) =>
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
			);

			pages.forEach((embed, index) => {
				const { page: e } = embed;
				const page = index;
				if (e instanceof EmbedBuilder) {
					messages.set(page, { embeds: [e as EmbedBuilder], components: actionRows });
				} else {
					const combinedRows = [...actionRows, ...(e.components || [])];
					e.components = combinedRows;
					messages.set(page, e as InteractionReplyOptions | MessageReplyOptions);
				}
			});

			const sentMessage = message
				? await (rMsg
					? rMsg.edit(messages.get(0) as MessageEditOptions)
					: message?.reply(messages.get(0) as MessageReplyOptions))
				: interaction?.deferred
					? await interaction?.editReply(messages.get(0) as InteractionReplyOptions)
					: await interaction?.reply(messages.get(0) as InteractionReplyOptions);
			const userId = message ? message.author.id : interaction?.user.id;
			const collector = sentMessage?.createMessageComponentCollector({
				filter: (i) => i.isStringSelectMenu() && i.customId.startsWith(id) && i.user.id == userId,
				time: 60_000 * 60,
			});

			collector?.on('collect', async (i) => {
				if (!i.isStringSelectMenu()) return;
				const page = parseInt(i.values[0]);
				const msg = messages.get(page);
				if (!msg) return;
				await i.update({});
				interaction ? interaction.editReply(msg as InteractionEditReplyOptions) : sentMessage?.edit(msg as any);
			});

			collector?.on('end', async (_, reason) => {
				if (reason == 'time')
					interaction ? interaction.editReply({ components: [] }) : sentMessage?.edit({ components: [] });
			});
			return sentMessage as Message;
			break;
		}
		default: {
			throw new Error('Invalid pagination type provided');
		}
	}
}
