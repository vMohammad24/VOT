import { Events, type GuildTextBasedChannel } from 'discord.js';
import type { IListener } from '../handler/ListenerHandler';
import { getRows, sendPanel } from '../util/music';

export default {
	name: 'Lavalink Handler',
	description: 'Music related events',
	execute: async (handler) => {
		const { client, kazagumo, logger, executeCommand, commands } = handler;
		kazagumo.shoukaku.on('ready', (name) => { if (handler.verbose) logger.info(`Lavalink ${name}: Ready!`) });
		kazagumo.shoukaku.on('error', (name, error) => { if (handler.verbose) logger.error(`Lavalink ${name}: Error Caught,`, error) });
		kazagumo.shoukaku.on('close', (name, code, reason) => {
			if (handler.verbose)
				logger.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`)
		}
		);
		kazagumo.shoukaku.on('debug', (name, info) => { if (handler.verbose) logger.debug(`Lavalink ${name}: Debug,`, info) });
		kazagumo.shoukaku.on('disconnect', (name, players) => {
			if (handler.verbose)
				logger.warn(`Lavalink ${name}: Disconnected, Players: ${players}}`)
		});
		kazagumo.on('playerMoved', (player, status, channelData) => {
			if (handler.verbose) logger.info(`Player ${player.guildId} moved to ${channelData.newChannelId}`);
			switch (status) {
				case 'LEFT':
					player.queue.clear();
					player.destroy();
					break;
				default:
					if (channelData.newChannelId && channelData.newChannelId !== player.voiceId) {
						player.voiceId = channelData.newChannelId;
					}
			}
		});

		kazagumo.on('playerStart', (player, track) => {
			if (handler.verbose) logger.info(`Player ${player.guildId} started playing ${track.title}`);
			const member = player.queue.current?.requester;
			if (member) {
				const channel = client.channels.cache.get(player.voiceId!) as GuildTextBasedChannel;
				if (channel) {
					sendPanel(kazagumo, channel.guild);
				}
			}
		});

		kazagumo.on('playerEnd', async (player) => {
			if (handler.verbose) logger.info(`Player ${player.guildId} ended`);
			const channelId = player.voiceId;
			const messageId = player.data.get('messageId');
			const guildId = player.guildId;
			if (messageId && channelId && guildId) {
				const msg = await (
					(await (await client.guilds.fetch(guildId)).channels.fetch(channelId)) as GuildTextBasedChannel
				).messages.fetch(messageId);
				if (msg) {
					await msg.delete();
				}
			}
		});



		client.on(Events.InteractionCreate, async (inter) => {
			const ids = ['pause', 'resume', 'skip', 'queue', 'stop', 'loop', 'shuffle', 'volume'];
			if (!inter.isButton()) return;
			if (!ids.includes(inter.customId)) return;
			const player = kazagumo.getPlayer(inter.guildId!);
			if (!player) {
				inter.reply({ content: 'Nothing is currently being played', ephemeral: true });
				return;
			}
			switch (inter.customId) {
				case 'pause':
					player.pause(true);
					inter.update({
						components: getRows(player),
						content: `Paused by ${inter.user}`,
					});
					break;
				case 'resume':
					player.pause(false);
					inter.update({
						components: getRows(player),
						content: `Resumed by ${inter.user}`,
					});
					break;
				case 'skip':
					player.skip();
					inter.message?.delete();
					break;
				case 'queue':
					executeCommand.call(handler, commands?.find((cmd) => cmd.name === 'queue')!, inter);
					break;
				case 'stop':
					player.destroy();
					inter.message?.delete();
					break;
				case 'loop':
					player.setLoop(player.loop === 'queue' ? 'none' : 'queue');
					inter.update({
						components: getRows(player),
					});
					break;
				case 'shuffle':
					player.queue.shuffle();
					inter.update({
						content: `Queue shuffled by ${inter.user}`,
					});
					break;
				case 'volume':
					const volume = player.volume;
					inter.update({
						content: `${inter.member}, Current volume is ${volume}. Please enter a new volume level from 1-100\n-# Volume request will expire in 15 seconds`,
					});
					const collector = (inter.channel as GuildTextBasedChannel).createMessageCollector({
						time: 15000,
						filter: (m) => m.author.id === inter.user.id,
					});
					collector.on('collect', async (m) => {
						await m.delete();
						const newVolume = parseInt(m.content);
						if (isNaN(newVolume) || newVolume < 1 || newVolume > 100) {
							inter.followUp({
								content: 'Invalid volume level, please enter a number from 1-100',
								ephemeral: true,
							});
							return;
						}
						collector.stop();
						await player.setVolume(newVolume);
						await inter.editReply({
							content: `Volume set to ${newVolume} by ${inter.user}`,
						});
					});
					collector.on('end', (_, reason) => {
						if (reason == 'time')
							inter.editReply({
								content: '',
							});
					});
					break;
				default:
					inter.reply({ content: 'Invalid command', ephemeral: true });
					break;
			}
		});
	},
} as IListener;
