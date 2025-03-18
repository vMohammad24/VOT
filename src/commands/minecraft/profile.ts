import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { getCraftyProfile, getHead, getProfile, renderSkin3D, searchNames } from "../../util/minecraft";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    description: 'View the Minecraft profile of a user',
    options: [
        {
            name: 'player',
            description: 'The username or uuid of the player',
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        }
    ],
    type: 'all',
    autocomplete: async (inter) => {
        if (inter.responded) return;
        const input = inter.options.getString('player');
        if (inter.responded) return;
        if (!input) return inter.respond([{ value: '', name: 'Please provide a valid username or uuid' }]);
        if (inter.responded) return;
        const results = await searchNames(input);
        if (inter.responded) return;
        inter.respond(results.map(r => ({ name: r.name, value: r.uuid })));
    },
    execute: async ({ args }) => {
        const player = args.get('player') as string;
        if (!player) return {
            content: 'Please provide a valid username or uuid',
            ephemeral: true
        }


        const [labyProfile, craftyProfile] = await Promise.all([
            getProfile(player),
            getCraftyProfile(player)
        ]);

        if (typeof craftyProfile === 'string') return {
            content: 'Profile not found',
            embeds: [{
                title: 'Error',
                description: craftyProfile
            }]
        }

        if (typeof labyProfile === 'string') return {
            content: 'Profile not found',
            embeds: [{
                title: 'Error',
                description: craftyProfile
            }]
        }

        const { data } = craftyProfile;

        const activeSkin = labyProfile?.textures.SKIN?.find(s => s.active)?.image_hash
            ?? data.skins[0]?.texture;
        const skin = activeSkin ? await renderSkin3D(activeSkin) : null;
        const head = await getHead(data.uuid);

        const embed = new VOTEmbed()
            .setAuthor({ name: data.username, iconURL: head ? 'attachment://head.png' : undefined })
            .setFooter({ text: `UUID: ${data.uuid}` })
            .setImage(skin ? 'attachment://skin.png' : null)
            .setTimestamp();

        const usernames = [];
        if (data.usernames?.length > 0) {

            const allChanges = data.usernames.map(u => ({
                name: u.username,
                changed_at: u.changed_at,
                accurate: true
            })).sort((a, b) => {
                const dateA = a.changed_at ? new Date(a.changed_at).getTime() : 0;
                const dateB = b.changed_at ? new Date(b.changed_at).getTime() : 0;
                return dateB - dateA;
            });


            const oneMonth = 30 * 24 * 60 * 60 * 1000;
            const filtered = allChanges.filter((change, i, arr) => {
                if (!change.changed_at) {
                    return !arr.some((other, j) =>
                        i > j && !other.changed_at &&
                        other.name.toLowerCase() === change.name.toLowerCase()
                    );
                }

                const changeDate = new Date(change.changed_at).getTime();
                return !arr.some((other, j) => {
                    if (i === j || !other.changed_at) return false;
                    const otherDate = new Date(other.changed_at).getTime();
                    const withinMonth = Math.abs(changeDate - otherDate) <= oneMonth;

                    if (!withinMonth) return false;

                    if (other.name === '-' || change.name === '-') {
                        return other.name !== '-' && change.name === '-';
                    }
                    return j < i;
                });
            });

            usernames.push(...filtered.map(u =>
                `**${u.name}**: (${u.changed_at ? `<t:${Math.round(new Date(u.changed_at).getTime() / 1000)}:R>` : 'Original'})`
            ));

            if (usernames.length > 0) {
                embed.setDescription(usernames.join('\n'));
            }
        }

        return {
            embeds: [embed],
            files: [
                skin ? { attachment: skin, name: 'skin.png' } : undefined,
                head ? { attachment: head, name: 'head.png' } : undefined
            ].filter(Boolean)
        }
    }
} as ICommand