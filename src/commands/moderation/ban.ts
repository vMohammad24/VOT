import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { createCase } from '../../util/cases';

export default {
	description: 'Bans a member',
	perms: ['BanMembers'],
	options: [
		{
			name: 'member',
			description: 'The member to ban',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'reason',
			description: 'Why are you banning this member',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	execute: async ({ guild, member: kicker, args, handler }) => {
		const member = args.get('member') as GuildMember;
		if (!member)
			return {
				content: 'Please provide a valid member',
				ephemeral: true,
			};
		const reason = args.get('reason') as string;
		if (kicker.roles.highest.comparePositionTo(member.roles.highest) <= 0 || guild.ownerId === member.id) {
			return {
				content: 'You cannot ban this member as they have a higher role than you',
				ephemeral: true,
			};
		}
		// check if the bot has the perms to ban the member
		if (!member.bannable) {
			return {
				content: 'I cannot ban this member',
				ephemeral: true,
			};
		}

		// Create a case for this ban
		const newCase = await createCase(guild.id, 'Ban', member.id, kicker.id, reason);

		const userEmbed = new EmbedBuilder()
			.setTitle('Banned')
			.setDescription(`You have been banned from **${guild.name}**`)
			.setColor('Red')
			.setTimestamp()
			.setFooter({
				text: `Banned by ${kicker.user.tag}`,
				iconURL: kicker.user.displayAvatarURL(),
			})
			.addFields({ name: 'Reason', value: reason || 'No reason provided' })
			.setFooter({ text: `Case ID: ${newCase.caseId}` });

		const embed = new EmbedBuilder()
			.setTitle('Banned')
			.setDescription(`**${member.user.tag}** has been banned`)
			.setColor('Red')
			.setTimestamp()
			.setFooter({
				text: `Banned by ${kicker.user.tag} • Case ID: ${newCase.caseId}`,
				iconURL: kicker.user.displayAvatarURL(),
			})
			.addFields({ name: 'Reason', value: reason || 'No reason provided' });

		try {
			// await member.send({ embeds: [userEmbed] });
		} catch (e) { }
		await member.ban({
			reason: `${reason || 'No reason provided'} (Case #${newCase.caseId})`,
		});
		return {
			embeds: [embed],
		};
	},
} as ICommand;
