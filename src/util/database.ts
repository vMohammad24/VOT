import { Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { Guild, GuildMember, User } from 'discord.js';
import commandHandler, { redis } from '..';

export async function getUser(member: User, select?: Prisma.UserSelect<DefaultArgs>) {
	const cacheKey = `user:${member.id}:${JSON.stringify(select)}`;
	const cachedUser = await redis.get(cacheKey);

	if (cachedUser) {
		return JSON.parse(cachedUser);
	}

	const user = await commandHandler.prisma.user.upsert({
		where: {
			id: member.id,
		},
		update: {
			avatar: member.avatarURL(),
			name: member.tag,
		},
		create: {
			id: member.id,
			avatar: member.avatarURL(),
			name: member.tag,
		},
		select,
	});

	redis.set(cacheKey, JSON.stringify(user), 'EX', 2); // Expires in 1 hour
	return user;
}

export async function getUserByID(id: string, select?: Prisma.UserSelect<DefaultArgs>) {
	const cacheKey = `user:${id}:${JSON.stringify(select)}`;
	const cachedUser = await redis.get(cacheKey);

	if (cachedUser) {
		return JSON.parse(cachedUser);
	}

	const user = await commandHandler.prisma.user.upsert({
		where: {
			id,
		},
		update: {},
		create: {
			id,
		},
		select,
	});

	await redis.set(cacheKey, JSON.stringify(user), 'EX', 10); // Expires in 1 hour
	return user;
}

export async function getMember(guildMember: GuildMember, select?: Prisma.MemberSelect<DefaultArgs>) {
	const cacheKey = `member:${guildMember.user.id}:${guildMember.guild.id}:${JSON.stringify(select)}`;
	const cachedMember = await redis.get(cacheKey);

	if (cachedMember) {
		return JSON.parse(cachedMember);
	}

	const user = await getUser(guildMember.user, { id: true });
	const guild = await getGuild(guildMember.guild, { id: true });

	const member = await commandHandler.prisma.member.upsert({
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

	await redis.set(cacheKey, JSON.stringify(member), 'EX', 2); // Expires in 1 hour
	return member;
}

export async function getGuild(guild: Guild, select?: Prisma.GuildSelect<DefaultArgs>) {
	const cacheKey = `guild:${guild.id}:${JSON.stringify(select)}`;
	const cachedGuild = await redis.get(cacheKey);

	if (cachedGuild) {
		return JSON.parse(cachedGuild);
	}

	const guildData = await commandHandler.prisma.guild.upsert({
		where: { id: guild.id },
		create: {
			id: guild.id,
			name: guild.name,
			prefix: ';',
		},
		update: {
			name: guild.name,
		},
		select,
	});

	await redis.set(cacheKey, JSON.stringify(guildData), 'EX', 10); // Expires in 1 hour
	return guildData;
}


export async function getCachedSite(site: string, wait: boolean = false) {
	const cachedSite = await redis.get(`site:${wait}:${site}`);

	if (cachedSite) {
		return Buffer.from(cachedSite, 'base64');
	}

	return null;
}

export async function cacheSite(site: string, wait: boolean, data: Buffer) {
	await redis.set(`site:${wait}:${site}`, data.toString('base64'), 'EX', 600);
	return data;
}