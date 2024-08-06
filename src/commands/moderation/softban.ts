import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	name: 'softban',
	aliases: ['sb', 'softb', 'sban'],
	description: "Temporarily ban and immediately unban to erase a user's messages from the past week.",
	options: [
		{
			name: 'user',
			description: 'The user to softban',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'reason',
			description: 'The reason for softbanning the user',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	perms: ['BanMembers'],
	execute: async ({ args, guild, member }) => {
		const user = args.get('user') as GuildMember;
		const reason = args.get('reason') || 'No reason provided' + ` - Softbanned by ${member.user.tag}`;
		if (!user) return 'User not found';
		if (!user.bannable) return { content: 'I cannot ban this user', ephemeral: true };
		if (user.id === member.id) return { content: 'You cannot softban yourself', ephemeral: true };
		if (member.roles.highest.position <= user.roles.highest.position)
			return {
				content: 'You do not have permission to softban this user',
				ephemeral: true,
			};

		await user.ban({ reason, deleteMessageSeconds: 604800 });
		await guild.bans.remove(user.id);
		const embed = new EmbedBuilder()
			.setTitle('Softban')
			.setDescription(`**${user.user.tag}** has been softbanned`)
			.setColor('Red')
			.setTimestamp()
			.setFooter({
				text: `Softbanned by ${member.user.tag}`,
				iconURL: member.user.displayAvatarURL(),
			});
		return { embeds: [embed] };
	},
} as ICommand;
