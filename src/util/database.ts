import { type Image, loadImage } from "@napi-rs/canvas";
import type { Prisma } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/library";
import {
	type APIApplication,
	type Client,
	type Guild,
	type GuildMember,
	Routes,
	type User,
} from "discord.js";
import commandHandler, { redis } from "..";

export async function getUser<T extends Prisma.UserSelect<DefaultArgs>>(
	member: User,
	select?: T,
): Promise<Prisma.UserGetPayload<{ select: T }>> {
	const cacheKey = `user:${member.id}:${JSON.stringify(select)}`;
	const cachedUser = await redis.get(cacheKey);

	if (cachedUser) {
		return JSON.parse(cachedUser);
	}

	let user;
	try {
		user = await commandHandler.prisma.user.upsert({
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
	} catch (e) {
		user = (await commandHandler.prisma.user.upsert({
			where: {
				id: member.id,
			},
			update: {
				name: member.tag,
			},
			create: {
				id: member.id,
				name: member.tag,
			},
			select: select || undefined,
		})) as Prisma.UserGetPayload<{ select: T }>;
	}

	redis.set(cacheKey, JSON.stringify(user), "EX", 2);
	return user as any;
}

export async function getCachedCommand(
	commandId: string,
	args: string,
	user: string,
	guild: string,
) {
	const cachedCommand = await redis.get(
		`command:${commandId}:${args}:${user}:${guild}`,
	);

	if (cachedCommand) {
		try {
			return JSON.parse(cachedCommand);
		} catch (e) {
			return cachedCommand;
		}
	}

	return null;
}
export async function cacheCommand(
	commandId: string,
	args: string,
	user: string,
	guild: string,
	response: string,
) {
	return await redis.set(
		`command:${commandId}:${args}:${user}:${guild}`,
		response,
		"EX",
		60,
	);
}
export async function getUserByID(
	id: string,
	select?: Prisma.UserSelect<DefaultArgs>,
) {
	const cacheKey = `user:${id}:${JSON.stringify(select)}`;
	const cachedUser = await redis.get(cacheKey);

	if (cachedUser) {
		return JSON.parse(cachedUser);
	}

	const user = await commandHandler.prisma.user.upsert({
		where: {
			id,
		},
		update: {
			economy: {
				connectOrCreate: {
					where: {
						userId: id,
					},
					create: {},
				},
			},
		},
		create: {
			id,
			economy: {
				create: {},
			},
		},
		select,
	});

	await redis.set(cacheKey, JSON.stringify(user), "EX", 2); // Expires in 1 hour
	return user;
}

export async function getMember(
	guildMember: GuildMember,
	select?: Prisma.MemberSelect<DefaultArgs>,
) {
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

	await redis.set(cacheKey, JSON.stringify(member), "EX", 2); // Expires in 1 hour
	return member;
}

export async function getGuild(
	guild: Guild,
	select?: Prisma.GuildSelect<DefaultArgs>,
) {
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
			prefix: ";",
		},
		update: {
			name: guild.name,
		},
		select,
	});

	await redis.set(cacheKey, JSON.stringify(guildData), "EX", 10); // Expires in 1 hour
	return guildData;
}

export async function getCachedSite(site: string, wait = false) {
	const cachedSite = await redis.get(`site:${wait}:${site}`);

	if (cachedSite && commandHandler.prodMode) {
		return Buffer.from(cachedSite, "base64");
	}

	return null;
}

export async function loadImg(source: string): Promise<Image> {
	const cacheKey = `image:${source.toString()}`;
	const cached = await redis.getBuffer(cacheKey);
	if (cached) {
		console.time("loadImageC");
		const c = await loadImage(cached);
		console.timeEnd("loadImageC");
		return c;
	}
	console.time("loadImage");
	const image = await loadImage(source);
	console.timeEnd("loadImage");
	await redis.setBuffer(cacheKey, image.src, "GET");
	return image;
}

export async function cacheSite(site: string, wait: boolean, data: Buffer) {
	await redis.set(`site:${wait}:${site}`, data.toString("base64"), "EX", 600);
	return data;
}

export async function getVoiceMaster(guildId: string) {
	return await commandHandler.prisma.voiceMaster.findFirst({
		where: { guildId },
		include: {
			openChannels: {
				include: {
					owner: true,
				},
			},
		},
	});
}
export async function getInstallCounts(client: Client): Promise<{
	approximate_guild_count: number;
	approximate_user_install_count: number;
}> {
	const cache = await redis.get("installCounts");
	if (cache) return JSON.parse(cache);
	const res = (await client.rest.get(
		Routes.currentApplication(),
	)) as APIApplication;
	const { approximate_guild_count, approximate_user_install_count } = res;
	redis.set(
		"installCounts",
		JSON.stringify({ approximate_guild_count, approximate_user_install_count }),
		"EX",
		60 * 5,
	);
	return {
		approximate_guild_count: approximate_guild_count ?? 0,
		approximate_user_install_count: approximate_user_install_count ?? 0,
	};
}
