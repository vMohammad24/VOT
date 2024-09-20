import { ApplicationCommandOptionType, Attachment, EmbedBuilder, GuildMember } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    description: 'Play a file',
    options: [
        {
            name: 'file',
            description: 'The file to play',
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }
    ],
    aliases: ['pfile', 'pf'],
    cooldown: 1000 * 60 * 5,
    needsPlayer: true,
    execute: async ({ args, player, member, handler: { kazagumo } }) => {
        const file = args.get('file') as Attachment | undefined;
        if (!file) return {
            content: 'No file provided',
            ephemeral: true
        };
        if (file && !file?.contentType?.startsWith('audio')) return {
            content: 'Invalid file type',
            ephemeral: true
        };
        const url = file.url;
        const embed = new EmbedBuilder().setTitle('Added to queue').setColor('Green');
        await kazagumo.search(url, { requester: member as GuildMember }).then(async (res) => {
            switch (res.type) {
                case 'TRACK':
                    const track = res.tracks[0];
                    player!.queue.add(track);
                    embed.setDescription(`Added [${track.title || 'Error getting title'}]${track.uri ? `(${track.uri})` : ''} to the queue`);
                    break;
                case 'SEARCH':
                    if (res.tracks[0]) {
                        player!.queue.add(res.tracks[0]);
                        embed.setDescription(`Added [${res.tracks[0].title || 'Error getting title'}]${res.tracks[0].uri ? `(${res.tracks[0].uri})` : ''} to the queue`);
                    } else {
                        embed.setDescription('No tracks found');
                    }
                    break;
                case 'PLAYLIST':
                    player!.queue.add(res.tracks);
                    embed.setTitle('Added Playlist to queue.');
                    embed.setColor('Orange');
                    let duration: number = 0;
                    res.tracks.forEach((e) => {
                        duration += e.length!;
                    });
                    embed.setDescription(
                        `Added ${res.playlistName} to the queue that will finish <t:${Math.round(
                            Date.now() / 1000 + duration / 1000,
                        )}:R>`,
                    );
                    break;
                default:

                    break;
            }
        });
        embed.setDescription(`${embed.data.description}\n\nGo to <#${member.voice.channelId}> to manage the queue`);
        if (!player!.playing) player!.play();
        return {
            embeds: [embed],
            ephemeral: true,
        };
    }
} as ICommand