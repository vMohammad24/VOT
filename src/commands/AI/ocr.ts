import axios from 'axios';
import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
export default {
	description: 'Extract text from an image',
	category: 'ai',
	shouldCache: true,
	options: [
		{
			name: 'image',
			description: 'The image you want to extract text from',
			type: ApplicationCommandOptionType.Attachment,
			required: true,
		}
	],
	type: 'all',
	execute: async ({ args, interaction }) => {
		const attachment = args.get('image') as Attachment | undefined;
		if (!attachment) return { ephemeral: true, content: 'Please provide an image to extract text from' };
		const form = new FormData();
		form.set('image', new Blob([await axios.get(attachment.url, { responseType: 'arraybuffer' }).then(res => res.data)]), attachment.name);
		form.set('fileName', attachment.name);
		form.set('userId', 'bcaf15e5-b8e1-43d7-90c7-c2966d1cbed8'); // literally any random uuid

		const res = await axios.post('https://www.blackbox.ai/api/upload', form);

		if (res.status !== 200 || res.data.status !== "success") {
			return { ephemeral: true, content: 'Failed to process image' };
		}
		if (res.status !== 200) return { ephemeral: true, content: 'Failed to upload image' };
		const { response, status } = res.data;
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle('Extracted Text')
					.setDescription(response ?? '> Failed to extract text')
					.setColor('Green')
					.setImage(attachment.url),
			],
		};
	},
} as ICommand;
