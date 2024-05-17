import type { APIApplicationCommandInteraction, CommandInteraction, GuildTextBasedChannel } from "discord.js";
import type { IListener } from "../handler/listenres";
import { getRows, sendPanel } from "../util/music";

export default {
    name: "Lavalink Handler",
    description: "Music related events",
    execute: async (handler) => {
        const { client, kazagumo, logger, executeCommand, commands } = handler;
        kazagumo.shoukaku.on('ready', (name) => logger.info(`Lavalink ${name}: Ready!`));
        kazagumo.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
        kazagumo.shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
        kazagumo.shoukaku.on('debug', (name, info) => logger.debug(`Lavalink ${name}: Debug,`, info));
        kazagumo.shoukaku.on('disconnect', (name, players) => {

        });
        kazagumo.on('playerMoved', (player, status, channelData) => {
            switch (status) {
                case "LEFT":
                    player.queue.clear();
                    player.destroy();
                    break;
                default:
                    if (channelData.newChannelId && channelData.newChannelId !== player.voiceId) {
                        player.voiceId = channelData.newChannelId;
                    }
            }
        })

        kazagumo.on('playerStart', (player, track) => {
            const member = player.queue.current?.requester;
            if (member) {
                const channel = client.channels.cache.get(player.voiceId!) as GuildTextBasedChannel;
                if (channel) {
                    sendPanel(kazagumo, channel.guild);
                }
            }
        })

        kazagumo.on('playerEnd', async (player) => {
            const channelId = player.voiceId;
            const messageId = player.data.get('messageId');
            const guildId = player.guildId;
            if (messageId && channelId && guildId) {
                const msg = (await ((await (await client.guilds.fetch(guildId)).channels.fetch(channelId)) as GuildTextBasedChannel).messages.fetch(messageId))
                if (msg) {
                    await msg.delete();
                }
            }
        })

        client.on('interactionCreate', async (inter) => {
            const ids = ["pause", "resume", "skip", "queue", "stop", "loop", "shuffle", "volume"];
            if (inter.isButton()) {
                if (!ids.includes(inter.customId)) return;
                const player = kazagumo.getPlayer(inter.guildId!);
                if (!player) {
                    inter.reply({ content: "No player found", ephemeral: true });
                    return;
                };
                if (inter.customId === "pause") {
                    player.pause(true);
                    inter.update({
                        components: getRows("Resume")
                    })
                } else if (inter.customId === "resume") {
                    player.pause(false)
                    inter.update({
                        components: getRows("Pause")
                    })
                    // inter.message.delete();
                } else if (inter.customId === "skip") {
                    player.skip();
                    inter.message?.delete();
                } else if (inter.customId === "queue") {
                    executeCommand.call(handler, commands?.find(cmd => cmd.name === "queue")!, inter)
                } else if (inter.customId === "stop") {
                    player.destroy();
                    inter.message?.delete();
                } else if (inter.customId === "loop") {
                    player.setLoop(player.loop === "queue" ? "none" : "queue");
                    inter.update({
                        components: getRows(player.playing ? "Pause" : "Resume", player.loop === "queue")
                    })
                } else if (inter.customId === "shuffle") {
                    player.queue.shuffle();
                    inter.update({
                        content: "Queue shuffled by " + inter.user.username
                    })
                } else if (inter.customId === "volume") {
                    const volume = player.volume * 100;
                    inter.reply({ content: `Current volume is ${volume}. Please enter a new volume level from 1-100`, ephemeral: true });
                    const collector = (inter.channel as GuildTextBasedChannel).createMessageCollector({ time: 15000, filter: m => m.author.id === inter.user.id });
                    collector.on('collect', async m => {
                        await m.delete();
                        const newVolume = parseInt(m.content);
                        if (isNaN(newVolume) || newVolume < 1 || newVolume > 100) {
                            inter.followUp({ content: "Invalid volume level, please enter a number from 1-100", ephemeral: true });
                            return;
                        }
                        await player.setVolume(newVolume);
                        await inter.update({
                            content: `Volume set to ${newVolume} by ${inter.user.username}`
                        })
                        collector.stop();
                    });
                }
            }
        })

    }
} as IListener