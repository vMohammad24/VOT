import { Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { Guild, GuildMember } from 'discord.js';
import commandHandler from '..';
('..');

export async function getUser(member: GuildMember, select?: Prisma.UserSelect<DefaultArgs>) {
	return await commandHandler.prisma.user.upsert({
		where: {
			id: member.id,
		},
		update: {
			avatar: member.user.avatarURL(),
			name: member.displayName,
		},
		create: {
			id: member.id,
			avatar: member.user.avatarURL(),
			name: member.displayName,
		},
		select: select,
	});
}

export async function getUserByID(id: string, select?: Prisma.UserSelect<DefaultArgs>) {
	return await commandHandler.prisma.user.upsert({
		where: {
			id,
		},
		update: {},
		create: {
			id,
		},
		select,
	});
}

export async function getMember(guildMember: GuildMember, select?: Prisma.MemberSelect<DefaultArgs>) {
	const user = await getUser(guildMember, { id: true });
	const guild = await getGuild(guildMember.guild, { id: true });
	return await commandHandler.prisma.member.upsert({
		where: {
			userId_guildId: {
				userId: user.id,
				guildId: guild.id,
			},
		},
		create: {
			userId: user.id,
			guildId: guild.id,
		},
		update: {},
		select,
	});
}

export async function getGuild(guild: Guild, select?: Prisma.GuildSelect<DefaultArgs>) {
	return await commandHandler.prisma.guild.upsert({
		where: { id: guild.id },
		create: {
			id: guild.id,
			name: guild.name,
		},
		update: {
			name: guild.name,
		},
		select,
	});
}
