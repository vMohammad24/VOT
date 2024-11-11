import axios from 'axios';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
export default {
	name: 'virustotal',
	description: 'Check a url for viruses',
	options: [
		{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: 'The url to check for viruses on',
			required: true,
		},
	],
	type: 'all',
	aliases: ['vt'],
	execute: async ({ args }) => {
		let url = (args.get('url') as string) || undefined;
		if (!url)
			return {
				content: 'No url provided.',
				ephemeral: true,
			};
		if (!url.startsWith('http')) url = `https://${url}`;
		try {
			new URL(url);
		} catch (e) {
			return {
				content: 'Invalid url.',
				ephemeral: true,
			};
		}
		const res = await axios.get(
			`https://www.virustotal.com/vtapi/v2/url/report?apikey=${import.meta.env.VIRUSTOTAL_API_KEY}&resource=${url}`,
		);
		const embed = new EmbedBuilder()
			.setTitle('Virustotal')
			.setAuthor({ name: 'Scan', url: res.data.permalink })
			.setColor('Random')
			.setDescription(`${res.data.positives} positive result(s) out of ${res.data.total}.`);
		if (!res.data.scans)
			return {
				ephemeral: true,
				content: `Invalid site.`,
			};
		for (const [name, s] of Object.entries(res.data.scans)) {
			const scan = s as any;
			if ((scan as any).detected) {
				const text = scan.detail ? `[${scan.result}](${scan.detail})` : scan.result;
				embed.addFields({ name: name, value: text, inline: true });
			}
		}
		if (res.data.response_code === 1) {
			return {
				embeds: [embed],
			};
		} else {
			return 'No results found';
		}
	},
} as ICommand;
