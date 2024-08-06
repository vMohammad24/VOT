import { ApplicationCommandOptionType, EmbedBuilder, type BaseGuildTextChannel } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Nukes a channel',
	perms: ['ManageChannels', 'ManageMessages', 'ManageGuild'],
	options: [
		{
			name: 'channel',
			description: 'The channel to nuke',
			type: ApplicationCommandOptionType.Channel,
			required: false,
		},
	],
	execute: async ({ channel, guild, member, args }) => {
		const c = (args.get('channel') as BaseGuildTextChannel) || channel;
		if (!c) {
			return 'Please provide a valid channel';
		}
		await c
			.clone({ reason: 'Nuked', name: c.name })
			.then(async (ch) => {
				c.delete('Nuked');
				const embed = new EmbedBuilder()
					.setTitle('Nuked')
					.setDescription(`#${c.name} has been nuked`)
					.setColor('Random')
					.setTimestamp()
					.setFooter({
						text: `Nuked by ${member.user.displayName}`,
						iconURL: member.user.displayAvatarURL(),
					})
					.setImage('https://cdn.nest.rip/uploads/73134e91-7998-4e63-b9e6-11832b4f7cac.gif');
				await ch.send({ embeds: [embed] });
			})
			.catch((err) => {
				return err;
			});
	},
} as ICommand;
