import { EmbedBuilder } from '@discordjs/builders';
import axios from 'axios';
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { searchSaver } from '../../util/beatsaver';
import { pagination } from '../../util/pagination';
import { getFrontEndURL } from '../../util/urls';

export default {
	name: 'bsaber',
	description: 'Get a beat saber map for the currently playing song',
	aliases: ['bs', 'beatsaver', 'beatsaber'],
	options: [{
		name: "song",
		required: false,
		description: "The song you want to search for",
		type: ApplicationCommandOptionType.String
	}],
	type: 'all',
	execute: async ({ interaction, player, message, member, args }) => {
		const songTitle = args.get('song') || (player ? player.queue.current?.title : null);
		if (!songTitle) return { content: "Couldn't retrive song", ephemeral: true };
		try {
			const res = await searchSaver(songTitle, 'Relevance');
			if (typeof res === 'string') return { content: res, ephemeral: true };

			res.sort((a, b) => b.stats.score - a.stats.score);
			// sort by relevance
			res.sort((a, b) => {
				const aName = a.name.toLowerCase();
				const bName = b.name.toLowerCase();
				const songName = songTitle.toLowerCase();
				const aIndex = aName.indexOf(songName);
				const bIndex = bName.indexOf(songName);
				if (aIndex === -1 && bIndex === -1) return 0;
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			});
			if (res.length === 0) return { content: 'No maps were found for this song', ephemeral: true };
			const items = await res.map(async map => {
				// Log the map object to inspect its structure

				const latestVersion = map.versions[map.versions.length - 1];

				// Check for undefined values and provide default values or skip
				const mapName = map.name ?? 'Unknown';
				const description = map.description ?? 'No description available.';
				const uploaderName = map.uploader?.name ?? 'Unknown uploader';
				const plays = map.stats?.plays?.toString() ?? '0';
				const downloads = map.stats?.downloads?.toString() ?? '0';
				const rating = map.stats?.score?.toString() ?? 'N/A';
				const coverURL = latestVersion.coverURL ?? '';
				const downloadURL = latestVersion.downloadURL ?? '';
				const oneClickURL = `${getFrontEndURL()}/beatsaber?id=${map.id}`;
				const previewURL = latestVersion.previewURL ?? '';
				const avatarURL = map.uploader?.avatar ?? '';
				const preview = await axios.get(previewURL, { responseType: 'arraybuffer' });
				return {
					embed: new EmbedBuilder()
						.setTitle(mapName)
						.setDescription(description.slice(0, 200) + (description.length > 200 ? '...' : ''))
						.setFields([
							{ name: 'Plays', value: plays, inline: true },
							{ name: 'Downloads', value: downloads, inline: true },
							{
								name: 'One click',
								value: `[Click here](${oneClickURL})`,
								inline: true,
							},
						])
						.setThumbnail(coverURL)
						.setFooter({
							text: `Mapped by ${uploaderName} • ${rating} rating`,
							iconURL: avatarURL,
						})
						.setTimestamp(new Date(map.updatedAt))
						.setColor([0, 255, 0]),
					name: mapName,
					attachments: [new AttachmentBuilder(Buffer.from(preview.data), { name: "preview.mp3" })],
				}
			});
			const mapNames = res.map((map) => map.name);
			// await new Pagination(message ? message : interaction!, items, {
			//     type: PaginationType.SelectMenu,
			//     pageText: mapNames,
			//     showStartEnd: false,
			// }).send();
			// await pagination({
			// 	author: member.user,
			// 	embeds: items as any,
			// });
			await pagination({
				interaction: interaction,
				message: message,
				embeds: await Promise.all(items) as any,
				type: 'select'
			})
		} catch (error) {
			commandHandler.logger.error(error);
			return {
				content: 'An error occurred while fetching the beat map.',
				ephemeral: true,
			};
		}
	},
} as ICommand;
