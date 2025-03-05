import axios from 'axios';
import { ApplicationCommandOptionType, AttachmentBuilder, Sticker } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { isNullish } from '../../util/util';

export default {
	name: 'yoink',
	description: 'Yoinks emojis from a message and adds them to the guild',
	options: [
		{
			name: 'emojis',
			description: 'The emojis to yoink',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	perms: ['CreateGuildExpressions'],
	aliases: ['yoinkemoji', 'stealemoji', 'steal'],
	execute: async ({ args, interaction, guild, member, message }) => {
		;
		let text = args.get('emojis') as string | undefined;
		const err = {
			content: 'Please provide some emojis to yoink',
			ephemeral: true,
		};
		const type: 'emojis' | 'stickers' = 'emojis';
		const stickers: Sticker[] = [];
		if (!text) {
			if (!message) return err;
			if (message.reference) {
				const m = await message.fetchReference();
				if (!m) return err;
				text = m.content;
				if (m.stickers.size > 0) {
					stickers.push(...m.stickers.values());
				}
			}
			if (message.stickers.size > 0) {
				stickers.push(...message.stickers.values());
			}
		}
		if (stickers.length > 0) {
			let yoined = '';
			for (const sticker of stickers) {
				try {
					const buffer = (await axios.get(sticker.url, { responseType: 'arraybuffer' })).data;
					const e = await guild.stickers.create({
						name: sticker.name,
						description: sticker.description,
						tags: sticker.tags ?? sticker.name,
						file: new AttachmentBuilder(buffer, { name: sticker.name + '.png' }).attachment,
						reason: `Yoinked by ${member.user.tag}`,
					});
					yoined += e.url + '\n';
				} catch (e) {
					if ((e as any).message.includes('Maximum number of stickers reached')) {
						return {
							content: 'Maximum number of stickers reached',
							ephemeral: true,
						};
					}
					return {
						content: `An error occurred while trying to yoink stickers (${(e as any).message})`,
						ephemeral: true,
					};
				}
			}
			if (isNullish(yoined)) {
				return {
					content: "Couldn't yoink any stickers",
					ephemeral: true,
				};
			} else {
				return {
					content: `Successfully yoinked stickers: ${yoined}`,
				};
			}
		}
		if (!text) return err;
		const emojiMatches = text.match(/<a?:\w+:(\d+)>/g);
		if (!emojiMatches) {
			return {
				content: 'No valid emojis found',
				ephemeral: true,
			};
		}

		const results = [];
		for (const emoji of emojiMatches) {
			const id = emoji.match(/<a?:\w+:(\d+)>/)?.[1];
			const name = emoji.match(/<a?:\w+:(\d+)>/)?.[0].split(':')[1];
			const url = `https://cdn.discordapp.com/emojis/${id}.png`;
			try {
				const e = await guild.emojis.create({
					attachment: url,
					name: name ?? 'yoinked_' + id,
					reason: `Yoinked by ${member.user.tag}`,
				});
				results.push(e.toString());
			} catch (e) {
				if ((e as any).message.includes('Maximum number of emojis reached')) {
					return {
						content: 'Maximum number of emojis reached',
						ephemeral: true,
					};
				}
			}
		}

		return {
			content: `Successfully yoinked emojis: ${results.join(', ')}`,
		};
	},
} as ICommand;
