import { ApplicationCommandOptionType } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { chat } from '../../util/ai';
import { pagination } from '../../util/pagination';

export default {
	description: 'test command for devs',
	type: 'all',
	disabled: commandHandler.prodMode,
	options: [
		{
			name: 'query',
			description: 'The search query',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	perms: 'dev',
	execute: async ({ user, interaction, member, handler, args, guild, channel, message, editReply }) => {
		const query = args.get('query') as string | null;
		if (!query) return { content: 'No query provided' };
		const res = await chat(query, '', 'evil');
		await pagination({
			interaction,
			message,
			pages: res.match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text,
					allowedMentions: {},
				},
			})),
			type: 'buttons',
		});
		// const client = getClient();
		// const res = await client.chat.completions.create({
		// 	stream: false,
		// 	messages:2 [/
		// 		{
		// 			role: 'user',
		// 			content: query,
		// 		},
		// 	],
		// 	model: 'deepseek-r1'
		// });
		// console.log(res.choices[0].message)
		// return {
		// 	content: res.choices[0].message.content
		// };
		// const voiceMaster = await handler.prisma.voiceMaster.upsert({
		// 	where: { guildId: guild.id },
		// 	update: {},
		// 	create: {
		// 		guildId: guild.id,
		// 		voiceChannel: '1307054705331142716',
		// 		textChannel: '1307054672787411005'
		// 	},
		// })
		// const vmChannel = guild.channels.cache.get(voiceMaster.textChannel!);
		// if (!vmChannel) return;
		// if (vmChannel.type != ChannelType.GuildText) return;
		// const lockEmoji = getEmoji('lock').toString()
		// const hideEmoji = getEmoji('eye').toString()
		// const infoEmoji = getEmoji('info').toString()
		// const kickEmoji = getEmoji('ban').toString()
		// const claimEmoji = getEmoji('claim').toString()
		// await vmChannel.send({
		// 	embeds: [
		// 		await new VOTEmbed()
		// 			.setTitle('VoiceMaster')
		// 			.setDescription(`
		// Join <#${voiceMaster.voiceChannel}> to create a voice channel

		// ### ${lockEmoji} Lock/Unlock the voice channel
		// ### ${hideEmoji} Hides/Reveals the voice channel
		// ### ${infoEmoji} Information about the voice channel
		// ### ${kickEmoji} Kick a member from your voice channel
		// ### ${claimEmoji} Claim a voice channel
		// 					`)
		// 			.setAuthor({ name: guild.name, iconURL: guild.iconURL({}) || undefined })
		// 			.dominant()
		// 	],
		// 	components: [
		// 		new ActionRowBuilder<ButtonBuilder>()
		// 			.addComponents(
		// 				new ButtonBuilder()
		// 					.setCustomId('lock')
		// 					.setStyle(ButtonStyle.Primary)
		// 					.setEmoji(lockEmoji)
		// 				,
		// 				new ButtonBuilder()
		// 					.setCustomId('hide')
		// 					.setStyle(ButtonStyle.Primary)
		// 					.setEmoji(hideEmoji)
		// 				,
		// 				new ButtonBuilder()
		// 					.setCustomId('info')
		// 					.setStyle(ButtonStyle.Primary)
		// 					.setEmoji(infoEmoji)
		// 				,
		// 				new ButtonBuilder()
		// 					.setCustomId('kick')
		// 					.setStyle(ButtonStyle.Primary)
		// 					.setEmoji(kickEmoji)
		// 				,
		// 				new ButtonBuilder()
		// 					.setCustomId('claim')
		// 					.setStyle(ButtonStyle.Primary)
		// 					.setEmoji(claimEmoji)
		// 			)
		// 	]
		// });
		// 		return { content: JSON.stringify(voiceMaster) }
	},
} as ICommand;
