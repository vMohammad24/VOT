import type { IListener } from "../handler/listenres";

export default {
    name: "music",
    description: "Music related events",
    execute: async ({ client, kazagumo, prisma, logger }) => {
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
    }
} as IListener