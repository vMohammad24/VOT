import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { expNeededForLevel } from '../../listeners/_leveling.ts.old';

export default {
	description: 'Displays your current level or the level of a selected user',
	options: [
		{
			name: 'user',
			description: 'The user whose level you want to get',
			type: ApplicationCommandOptionType.User,
		},
	],
	execute: async ({ args, handler, guild, member }) => {
		const user = (args.get('user') as GuildMember) || member;
		const prismaUser = await handler.prisma.member.findFirst({
			where: {
				guildId: guild.id,
				userId: user.id,
			},
		});
		if (!prismaUser) return;

		const embed = new EmbedBuilder()
			.setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
			.setColor('Random')
			.setDescription(
				`**Level**: ${prismaUser.level}\n**EXP**: ${prismaUser.exp}/${expNeededForLevel(prismaUser.level + 1)}`,
			)
			.setTimestamp()
			.setColor('Green');
		return {
			embeds: [embed],
		};
		// const width = 800;
		// const height = 256;
		// const canvas = createCanvas(width, height);
		// const ctx = canvas.getContext('2d');
		// const pfp = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
		// const mostUsedColors = getTwoMostUsedColors(pfp)
		// const grad = ctx.createLinearGradient(0, 0, width, height);
		// for (const [i, color] of mostUsedColors.entries()) {
		//     grad.addColorStop(i, `rgb(${color[0]}, ${color[2]}, ${color[2]})`);
		// }
		// ctx.fillStyle = grad;
		// ctx.fillRect(0, 0, width, height);
		// ctx.drawImage(pfp, 0, 0, 256, 256);
		// ctx.font = '36px sans-serif';
		// ctx.fillStyle = 'white';
		// ctx.fillText(user.displayName, 270, 50);
		// ctx.font = '15px sans-serif';
		// const progressBarWidth = 300;
		// const progressBarHeight = 50;
		// const progressBarX = (width - progressBarWidth) / 2 + 30;
		// const progressBarY = (height - progressBarHeight) / 2;
		// const percentage = Math.round((prismaUser.exp / expNeededForLevel(prismaUser.level)) * 100);
		// ctx.fillStyle = '#e0e0e0';
		// ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
		// // Draw the progress
		// ctx.fillStyle = '#76c7c0';
		// const progressWidth = (progressBarWidth * percentage) / 100;
		// ctx.fillRect(progressBarX, progressBarY, progressWidth, progressBarHeight);

		// // Draw the border of the progress bar
		// ctx.strokeStyle = '#000000';
		// ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

		// // Optionally, add a text showing the percentage
		// ctx.fillStyle = '#000000';
		// ctx.font = '10px Arial';
		// ctx.fillText(`${percentage}%`, progressBarX + progressBarWidth / 2 - 30, progressBarY + progressBarHeight / 1.5);
		// ctx.fillText(`Level: ${prismaUser.level}`, progressBarX + progressBarWidth / 2 - 30, progressBarY + progressBarHeight / 2.5);
		// ctx.fillText(`Exp: ${prismaUser.exp}`, progressBarX + progressBarWidth / 2 - 30, progressBarY + progressBarHeight / 1.7);
		// ctx.fillText(`Needed Exp: ${expNeededForLevel(prismaUser.level)}`, progressBarX + progressBarWidth / 2 - 30, progressBarY + progressBarHeight / 1.4);
		// return {
		//     files: [{
		//         attachment: canvas.toBuffer('image/png'),
		//         name: 'level.png'
		//     }],
		//     ephemeral: true
		// }
	},
} as ICommand;
