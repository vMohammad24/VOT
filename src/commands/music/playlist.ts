import type { Playlist, PrismaClient, Track } from '@prisma/client';
import { ApplicationCommandOptionType, Events, GuildMember } from 'discord.js';
import { Kazagumo, KazagumoTrack } from 'kazagumo';
import type ICommand from '../../handler/interfaces/ICommand';

const transferTracksTDB = (tracks: KazagumoTrack[], prisma: PrismaClient): Promise<Track[]> => {
	return Promise.all(
		tracks.map(async (track) => {
			return await prisma.track.upsert({
				where: {
					uri: track.uri,
				},
				create: {
					title: track.title,
					uri: track.uri!,
				},
				update: {
					title: track.title,
				},
			});
		}),
	);
};
const transferTracksFDB = (tracks: Track[], requester: any, kazagumo: Kazagumo): Promise<KazagumoTrack[]> => {
	return Promise.all(
		tracks.map(async (track) => {
			return (await kazagumo.search(track.uri, { requester })).tracks[0];
		}),
	);
};

const getPlaylists = async (prisma: PrismaClient, guildId: string, userId: string) => {
	return (await prisma.playlist.findMany({
		where: {
			OR: [{ guildId }, { userId: null, guildId: null }, { userId }],
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: 'asc',
		},
	})) as Playlist[];
};

export default {
	description: 'Playlist manager',
	slashOnly: true,
	init: async ({ client, prisma, kazagumo }) => {
		client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isAutocomplete()) return;
			if (interaction.commandName !== 'playlist') return;
			if (interaction.options.getSubcommand() == 'play') {
				const playlists = await getPlaylists(prisma, interaction.guildId!, interaction.user.id);
				const choices = playlists.map((playlist) => {
					return {
						name: playlist.name,
						value: playlist.id,
					};
				});
				interaction.respond(choices);
			} else if (interaction.options.getSubcommand() == 'update') {
				const playlistName = interaction.options.getString('name', true);
				const trackName = interaction.options.getString('track', true);
				const action = interaction.options.getString('action', true);
				const playlist = await prisma.playlist.findFirst({
					where: {
						OR: [
							{ id: playlistName },
							{
								AND: [{ name: playlistName }, { guildId: interaction.guildId }],
							},
							{
								AND: [{ name: playlistName }, { userId: interaction.user.id }],
							},
						],
					},
					include: {
						tracks: true,
					},
				});
				if (!playlist) {
					interaction.respond([{ name: 'Playlist not found', value: '' }]);
					return;
				}
				const tracks = playlist.tracks as Track[];
				let choices =
					action === 'remove'
						? tracks.map((track) => {
							return {
								name: track.title,
								value: track.uri,
							};
						})
						: [];
				if (choices.length === 0 || action === 'add') {
					const kazTracks = (
						await kazagumo.search(trackName, {
							requester: interaction.member as GuildMember,
						})
					).tracks;
					choices = kazTracks.map((track) => {
						return {
							name: track.title,
							value: track.uri!,
						};
					});
				}
				interaction.respond(choices);
			}
		});
	},
	options: [
		{
			name: 'create',
			description: 'Create a playlist',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'name',
					description: 'The name of the playlist',
					type: ApplicationCommandOptionType.String,
					required: true,
				},
				{
					name: 'type',
					description: 'The type of playlist',
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: [
						{ name: 'Public', value: 'public' },
						{ name: 'Private', value: 'private' },
						{ name: 'Guild', value: 'guild' },
					],
				},
			],
		},
		{
			name: 'play',
			description: 'Play a playlist',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'name',
					description: 'The name of the playlist',
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
		{
			name: 'update',
			type: ApplicationCommandOptionType.Subcommand,
			description: 'Add/Remove a track to a playlist',
			options: [
				{
					name: 'name',
					description: 'The name of the playlist',
					type: ApplicationCommandOptionType.String,
					required: true,
				},
				{
					name: 'action',
					description: 'The action to perform',
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: [
						{ name: 'Add', value: 'add' },
						{ name: 'Remove', value: 'remove' },
					],
				},
				{
					name: 'track',
					description: 'The track to add/remove',
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true,
				},
			],
		},
	],
	execute: async ({ interaction, player, handler }) => {
		if (!interaction) return;
		const subCommand = interaction.options.getSubcommand();
		const name = interaction.options.getString('name', true);
		switch (subCommand) {
			case 'create': {
				const type = interaction.options.getString('type', true);
				let playlist: Playlist & { tracks: Track[] };
				try {
					playlist = await handler.prisma.playlist.create({
						data: {
							name,
							guildId: type === 'guild' ? interaction.guildId : null,
							userId: interaction.user.id,
							tracks: {
								connect: await transferTracksTDB(
									[player!.queue.current!, ...player!.queue.map((track) => track)],
									handler.prisma,
								),
							},
						},
						include: {
							tracks: true,
						},
					});
				} catch (e) {
					if ((e as any).code === 'P2002') {
						return {
							content: 'Playlist already exists',
							ephemeral: true,
						};
					}
					return {
						content: 'An error occurred',
						ephemeral: true,
					};
				}
				return {
					content: `Playlist ${playlist.name} created with ${playlist.tracks.length} tracks`,
					ephemeral: true,
				};
			}
			case 'play': {
				if (!player) {
					return {
						content: 'Notihg is currently being played',
						ephemeral: true,
					};
				}
				const playlist = await handler.prisma.playlist.findFirst({
					where: {
						OR: [
							{ id: name },
							{ AND: [{ name }, { guildId: interaction.guildId }] },
							{ AND: [{ name }, { userId: interaction.user.id }] },
						],
					},
					include: {
						tracks: true,
					},
				});
				if (!playlist) {
					return {
						content: 'Playlist not found',
						ephemeral: true,
					};
				}
				if (playlist.userId && playlist.userId !== interaction.user.id) {
					return {
						content: "You don't have permission to play this playlist as it is private",
						ephemeral: true,
					};
				}
				if (playlist.guildId && playlist.guildId !== interaction.guildId) {
					return {
						content: 'This playlist is not available in this server',
						ephemeral: true,
					};
				}
				const tracks = await transferTracksFDB(playlist.tracks, interaction.member, handler.kazagumo);
				player.queue.add(tracks);
				if (!player.playing) {
					player.play();
				}
				return {
					content: `Playlist ${playlist.name} added to the queue`,
					ephemeral: true,
				};
			}
			case 'update': {
				const action = interaction.options.getString('action', true) as 'add' | 'remove';
				const playlist = await handler.prisma.playlist.findFirst({
					where: {
						OR: [
							{ id: name },
							{ AND: [{ name }, { guildId: interaction.guildId }] },
							{ AND: [{ name }, { userId: interaction.user.id }] },
						],
					},
					include: {
						tracks: true,
					},
				});
				if (!playlist) {
					return {
						content: 'Playlist not found',
						ephemeral: true,
					};
				}
				const uri = (
					await handler.kazagumo.search(interaction.options.getString('track', true), {
						requester: interaction.member as GuildMember,
					})
				).tracks[0];
				const track = await handler.prisma.track.upsert({
					where: {
						uri: uri.uri,
					},
					create: {
						title: uri.title,
						uri: uri.uri!,
					},
					update: {
						title: uri.title,
					},
				});
				switch (action) {
					case 'add': {
						if ((playlist.tracks as Track[]).find((t) => t.uri === uri.uri)) {
							return {
								content: 'Track already exists in the playlist',
								ephemeral: true,
							};
						}
						await handler.prisma.playlist.update({
							where: {
								id: playlist.id,
							},
							data: {
								tracks: {
									connect: track,
								},
							},
						});
						return {
							content: `Added ${uri.title} to ${playlist.name}`,
							ephemeral: true,
						};
					}
					case 'remove': {
						if (!(playlist.tracks as Track[]).find((t) => t.uri === uri.uri)) {
							return {
								content: 'Track not found in the playlist',
								ephemeral: true,
							};
						}
						await handler.prisma.playlist.update({
							where: {
								id: playlist.id,
							},
							data: {
								tracks: {
									disconnect: track,
								},
							},
						});
						return {
							content: `Removed ${uri.title} from ${playlist.name}`,
							ephemeral: true,
						};
					}
				}
			}
		}
		return {
			content: 'Unknown subcommand',
			ephemeral: true,
		};
	},
} as ICommand;
